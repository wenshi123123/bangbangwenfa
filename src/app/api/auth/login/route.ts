import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyCode } from '@/lib/sms/verify-code';
import { generateToken } from '@/lib/auth/token';
import { verifyPassword, validateUsername } from '@/lib/auth/password';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

// 登录失败限制配置
const LOGIN_FAIL_MAX = 5;           // 最大连续失败次数
const LOGIN_LOCK_MINUTES = 15;      // 锁定时间（分钟）
const LOGIN_RATE_WINDOW_MS = 60000; // 限流窗口
const LOGIN_RATE_MAX = 10;          // 每分钟最多登录尝试（含成功和失败）

// 内存中的失败计数（生产环境建议用 Redis 或数据库）
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

// 定期清理过期记录
const MAX_ATTEMPT_STORE = 5000;
let lastAttemptCleanup = Date.now();
function cleanupAttempts() {
  const now = Date.now();
  if (now - lastAttemptCleanup > 300000) { // 每5分钟清理
    const keysToDelete: string[] = [];
    for (const [key, entry] of loginAttempts.entries()) {
      if (now > entry.lockedUntil) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      loginAttempts.delete(key);
    }
    // 容量保护
    if (loginAttempts.size > MAX_ATTEMPT_STORE) {
      const keys = Array.from(loginAttempts.keys());
      for (let i = 0; i < keys.length - MAX_ATTEMPT_STORE + 500; i++) {
        loginAttempts.delete(keys[i]);
      }
    }
    lastAttemptCleanup = now;
  }
}

function attachAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  return response;
}

/**
 * 记录登录失败并检查是否需要锁定
 */
function recordLoginFailure(attemptKey: string): void {
  const existing = loginAttempts.get(attemptKey);
  const newCount = (existing?.count || 0) + 1;

  if (newCount >= LOGIN_FAIL_MAX) {
    loginAttempts.set(attemptKey, {
      count: newCount,
      lockedUntil: Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000,
    });
  } else {
    loginAttempts.set(attemptKey, {
      count: newCount,
      lockedUntil: existing?.lockedUntil || 0,
    });
  }
}

/**
 * POST /api/auth/login
 * 统一登录接口，支持多种用户类型：
 * 1. 验证码登录: { loginType: 'code', phone, code }
 * 2. 密码登录: { loginType: 'password', account, password }
 * 
 * 🔒 安全措施：
 * - 密码登录：连续失败 5 次后锁定 15 分钟
 * - 密码登录：每分钟最多 10 次尝试（含所有用户）
 * - 验证码登录：不受密码失败计数影响
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inferredLoginType =
      body?.loginType ||
      ((body?.password && (body?.account || body?.phone)) ? 'password' : 'code');
    const loginType = inferredLoginType;

    // 先做基础参数校验，避免缺参请求直接计入限流
    if (loginType === 'password') {
      if (!body?.account && !body?.phone) {
        return NextResponse.json(
          { success: false, error: '账号不能为空' },
          { status: 400 }
        );
      }
      if (!body?.password) {
        return NextResponse.json(
          { success: false, error: '密码不能为空' },
          { status: 400 }
        );
      }
    } else if (loginType === 'code') {
      if (!body?.phone) {
        return NextResponse.json(
          { success: false, error: '手机号不能为空' },
          { status: 400 }
        );
      }
      if (!body?.code) {
        return NextResponse.json(
          { success: false, error: '验证码不能为空' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: '无效的登录方式' },
        { status: 400 }
      );
    }

    const clientIP = getClientIP(request);

    // 全局登录限流（防止 DDoS）
    const rateLimit = checkRateLimit(`login:${clientIP}`, LOGIN_RATE_MAX, LOGIN_RATE_WINDOW_MS);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '登录尝试过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    if (loginType === 'code') {
      return await handleCodeLogin(body);
    } else if (loginType === 'password') {
      return await handlePasswordLogin(body, clientIP);
    }
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * 验证码登录
 * 支持普通用户、守护者、律师
 */
async function handleCodeLogin(body: { phone?: string; code?: string }) {
  const { phone, code } = body;

  // 参数校验
  if (!phone || !code) {
    return NextResponse.json(
      { success: false, error: '手机号和验证码不能为空' },
      { status: 400 }
    );
  }

  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return NextResponse.json(
      { success: false, error: '请输入正确的手机号' },
      { status: 400 }
    );
  }

  // 验证验证码
  const verifyResult = await verifyCode(phone, code, 'login');
  if (!verifyResult.valid) {
    return NextResponse.json(
      { success: false, error: verifyResult.reason || '验证码错误' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient();

  // 1. 先查 users 表（普通用户）
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (existingUser) {
    // 更新登录信息
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: (existingUser.login_count || 0) + 1
      })
      .eq('id', existingUser.id);

    // 查询关联的守护者信息
    const { data: guardianInfo } = await supabase
      .from('guardian_users')
      .select('*')
      .eq('phone', phone)
      .single();

    // 查询关联的已审核通过律师申请
    const { data: lawyerApp } = await supabase
      .from('lawyer_applications')
      .select('id, name, phone, user_id, review_status')
      .eq('review_status', 'approved')
      .or(`user_id.eq.${existingUser.id},phone.eq.${phone}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 仅在申请已审核通过时，才读取正式律师资料
    const { data: lawyerInfo } = lawyerApp
      ? await supabase
          .from('lawyers')
          .select('id, name, status, member_expires_at')
          .eq('phone', phone)
          .maybeSingle()
      : { data: null };

    // 🔧 确定主身份类型：律师 > 守护者 > 普通用户
    const effectiveUserType = lawyerApp ? 'lawyer'
      : guardianInfo ? 'guardian'
      : 'user';

    const token = await generateToken({
      id: existingUser.id,
      phone: existingUser.phone,
      username: existingUser.username,
      userType: effectiveUserType,
      guardianId: guardianInfo?.id,
      lawyerId: lawyerInfo?.id || lawyerApp?.id,  // 🔧 优先传入 lawyers 表 UUID
    });

    return attachAuthCookie(NextResponse.json({
      success: true,
      data: {
        user: {
          id: existingUser.id,
          phone: existingUser.phone,
          username: existingUser.username,
          nickname: existingUser.nickname,
          userType: effectiveUserType,
          // 守护者信息
          isGuardian: !!guardianInfo,
          guardianInfo: guardianInfo ? {
            id: guardianInfo.id,
            inviteCode: guardianInfo.invite_code,
            totalInvites: guardianInfo.total_invites,
            validInvites: guardianInfo.valid_invites,
            totalCommission: guardianInfo.total_commission,
            availableCommission: guardianInfo.available_commission,
          } : null,
          // 律师信息
          isLawyer: !!lawyerApp,
          lawyerInfo: lawyerApp ? {
            id: lawyerInfo?.id || lawyerApp.id,
            name: lawyerInfo?.name || lawyerApp.name,
            status: lawyerInfo?.status || 'approved',
            expireAt: lawyerInfo?.member_expires_at || null,
          } : null,
        },
        token
      }
    }), token);
  }

  // 2. 查 guardian_users 表（守护者）
  const { data: guardian } = await supabase
    .from('guardian_users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (guardian) {
    // 自动创建 users 表记录（如果没有）并回写 user_id
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        phone,
        nickname: guardian.nickname || `用户${phone.slice(-4)}`,
        source: 'guardian_login',
        login_count: 1,
        last_login_at: new Date().toISOString(),
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    // 优先使用新创建的 users.id，否则回退到 guardian.id（向后兼容）
    const userId = newUser?.id || guardian.id;

    // 🔧 关键修复：回写 guardian_users.user_id，确保密码登录也能通过 user_id 查到守护者信息
    if (newUser?.id) {
      await supabase
        .from('guardian_users')
        .update({ user_id: String(newUser.id) })
        .eq('id', guardian.id);
    }

    const token = await generateToken({
      id: userId,
      phone: guardian.phone,
      userType: 'guardian',
      guardianId: guardian.id,  // 🔧 修复：独立传入 guardian_users 表 ID
    });

    return attachAuthCookie(NextResponse.json({
      success: true,
      data: {
        user: {
          id: userId,
          phone: guardian.phone,
          username: null,
          nickname: guardian.nickname,
          userType: 'guardian',
          isGuardian: true,
          guardianInfo: {
            id: guardian.id,
            inviteCode: guardian.invite_code,
            totalInvites: guardian.total_invites,
            validInvites: guardian.valid_invites,
            totalCommission: guardian.total_commission,
            availableCommission: guardian.available_commission,
          },
          isLawyer: false,
          lawyerInfo: null,
        },
        token
      }
    }), token);
  }

  // 3. 查 lawyer_applications 表（律师申请）
  const { data: lawyerApp } = await supabase
    .from('lawyer_applications')
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lawyerApp) {
    // 检查律师申请状态
    if (lawyerApp.review_status === 'pending' && lawyerApp.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: '您的律师申请尚未支付，请完成支付后等待审核' },
        { status: 400 }
      );
    }
    
    if (lawyerApp.review_status === 'pending') {
      return NextResponse.json(
        { success: false, error: '您的律师账号正在审核中，请耐心等待' },
        { status: 400 }
      );
    }
    
    if (lawyerApp.review_status === 'rejected') {
      return NextResponse.json(
        { success: false, error: '您的律师申请已被拒绝，请联系管理员' },
        { status: 400 }
      );
    }

    if (lawyerApp.review_status === 'approved') {
      // 🔧 修复：从 lawyers 表查询 ID 和会员有效期（lawyer_applications.id 为整数，lawyers.id 为 UUID，两者不匹配）
      const { data: lawyerRecord } = await supabase
        .from('lawyers')
        .select('id, member_expires_at')
        .eq('phone', phone)
        .maybeSingle();
      
      const memberExpiresAt = lawyerRecord?.member_expires_at;
      const effectiveLawyerId = lawyerRecord?.id || lawyerApp.id; // 优先使用 lawyers 表的 UUID
      
      // 检查是否已过期
      if (memberExpiresAt && new Date(memberExpiresAt) < new Date()) {
        return NextResponse.json(
          { success: false, error: '您的律师会员已过期，请续费后登录' },
          { status: 400 }
        );
      }

      // 确保 users 表有记录
      let userId = lawyerApp.user_id;
      if (!userId) {
        // 创建 users 记录
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            phone,
            nickname: lawyerApp.name || `律师${phone.slice(-4)}`,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        userId = newUser?.id;
        
        // 更新 lawyer_applications 的 user_id
        if (userId) {
          await supabase
            .from('lawyer_applications')
            .update({ user_id: userId })
            .eq('id', lawyerApp.id);
        }
      }

      const token = await generateToken({
        id: userId,
        phone: lawyerApp.phone,
        userType: 'lawyer',
        lawyerId: effectiveLawyerId,  // 🔧 使用 lawyers 表的 UUID（而非 lawyer_applications 整数）
      });

      return attachAuthCookie(NextResponse.json({
        success: true,
        data: {
          user: {
            id: userId,
            phone: lawyerApp.phone,
            username: null,
            nickname: lawyerApp.name,
            userType: 'lawyer',
            isGuardian: false,
            guardianInfo: null,
            isLawyer: true,
            lawyerInfo: {
              id: effectiveLawyerId,  // 🔧 使用 lawyers 表 UUID
              name: lawyerApp.name,
              status: 'approved',
              expireAt: memberExpiresAt,
            },
          },
          token
        }
      }), token);
    }
  }

  // 4. 都没找到，提示注册
  return NextResponse.json(
    { success: false, error: '该手机号尚未注册' },
    { status: 400 }
  );
}

/**
 * 密码登录
 * 仅支持 users 表的用户（已设置密码）
 * 
 * 🔒 暴力破解防护：连续失败 LOGIN_FAIL_MAX 次后锁定 LOGIN_LOCK_MINUTES 分钟
 */
async function handlePasswordLogin(
  body: { account?: string; phone?: string; password?: string },
  clientIP: string
) {
  const account = body.account || body.phone;
  const { password } = body;

  // 参数校验
  if (!account || !password) {
    return NextResponse.json(
      { success: false, error: '账号和密码不能为空' },
      { status: 400 }
    );
  }

  cleanupAttempts();
  const attemptKey = `pwd:${clientIP}:${account.toLowerCase()}`;
  const attemptEntry = loginAttempts.get(attemptKey);

  // 检查是否被锁定
  if (attemptEntry && attemptEntry.lockedUntil > Date.now()) {
    const remainingMinutes = Math.ceil((attemptEntry.lockedUntil - Date.now()) / 60000);
    return NextResponse.json(
      { success: false, error: `登录尝试次数过多，请 ${remainingMinutes} 分钟后再试` },
      { status: 429 }
    );
  }

  const supabase = getSupabaseClient();

  // 判断是手机号还是用户名
  const isPhone = /^1[3-9]\d{9}$/.test(account);

  let user = null;
  let authError = false;

  if (isPhone) {
    // 手机号登录
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', account)
      .single();

    if (error || !data) {
      authError = true;
    } else {
      user = data;
    }
  } else {
    // 用户名登录
    const usernameValidation = validateUsername(account);
    if (!usernameValidation.valid) {
      authError = true;
    } else {
      // 🔒 使用 eq 精确匹配（而非 ilike），防止大小写变体探测
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', account.toLowerCase())
        .single();

      if (error || !data) {
        authError = true;
      } else {
        user = data;
      }
    }
  }

  // 用户不存在或格式错误 — 记录失败但不区分原因
  if (authError || !user) {
    recordLoginFailure(attemptKey);
    return NextResponse.json(
      { success: false, error: '账号或密码错误' },
      { status: 401 }
    );
  }

  // 检查是否设置了密码
  if (!user.password_hash) {
    return NextResponse.json(
      { success: false, error: '该账号未设置密码，请使用验证码登录' },
      { status: 400 }
    );
  }

  // 验证密码
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    recordLoginFailure(attemptKey);
    return NextResponse.json(
      { success: false, error: '账号或密码错误' },
      { status: 401 }
    );
  }

  // 登录成功，清除失败计数
  loginAttempts.delete(attemptKey);

  // 更新登录信息
  await supabase
    .from('users')
    .update({
      last_login_at: new Date().toISOString(),
      login_count: (user.login_count || 0) + 1
    })
    .eq('id', user.id);

  // 查询关联的守护者信息
  const { data: guardianInfo } = await supabase
    .from('guardian_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // 查询关联的律师信息（审核通过的申请）
  const { data: lawyerApp } = await supabase
    .from('lawyer_applications')
    .select('*')
    .eq('user_id', user.id)
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 🔧 从 lawyers 表获取准确的 member_expires_at 和 UUID
  let lawyerMemberExpiresAt: string | null = null;
  let lawyerUUID: string | null = null;
  if (lawyerApp) {
    const { data: lawyerRecord } = await supabase
      .from('lawyers')
      .select('id, member_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    lawyerMemberExpiresAt = lawyerRecord?.member_expires_at || null;
    lawyerUUID = lawyerRecord?.id || null;
  }

  // 🔧 确定主身份类型
  const effectiveUserType = lawyerApp ? 'lawyer'
    : guardianInfo ? 'guardian'
    : 'user';

  // 生成 token
  const token = await generateToken({
    id: user.id,
    phone: user.phone,
    username: user.username,
    userType: effectiveUserType,
    guardianId: guardianInfo?.id,
    lawyerId: lawyerUUID || lawyerApp?.id,  // 🔧 优先使用 lawyers 表 UUID
  });

  return attachAuthCookie(NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        nickname: user.nickname,
        userType: effectiveUserType,
        // 守护者信息
        isGuardian: !!guardianInfo,
        guardianInfo: guardianInfo ? {
          id: guardianInfo.id,
          inviteCode: guardianInfo.invite_code,
          totalInvites: guardianInfo.total_invites,
          validInvites: guardianInfo.valid_invites,
          totalCommission: guardianInfo.total_commission,
          availableCommission: guardianInfo.available_commission,
        } : null,
        // 律师信息
        isLawyer: !!lawyerApp,
        lawyerInfo: lawyerApp ? {
          id: lawyerUUID || lawyerApp.id,  // 🔧 优先 lawyers 表 UUID
          name: lawyerApp.name,
          status: 'approved',
          expireAt: lawyerMemberExpiresAt,  // 🔧 使用 member_expires_at
        } : null,
      },
      token
    }
  }), token);
}
