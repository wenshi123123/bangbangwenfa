import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { verifyCode } from '@/lib/sms/verify-code';
import { generateToken } from '@/lib/auth/token';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { decryptFields, LAWYER_SENSITIVE_FIELDS } from '@/lib/crypto/encryption';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    // 参数校验先于限流，避免无效请求消耗限流配额
    if (!phone) {
      return NextResponse.json({ success: false, error: '请输入手机号' }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ success: false, error: '请输入验证码' }, { status: 400 });
    }

    // 登录限流：同一 IP 5次/分钟（仅对有效请求限流）
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`${clientIP}:lawyer-login`, 5, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '登录尝试过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 验证验证码
    const verifyResult = await verifyCode(phone, code, 'login');
    if (!verifyResult.valid) {
      return NextResponse.json({ success: false, error: verifyResult.reason || '验证码错误' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 查找律师记录
    const { data: lawyer, error } = await supabase
      .from('lawyers')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'active')
      .single();

    if (error || !lawyer) {
      // 律师不存在，返回错误提示需要先入驻
      return NextResponse.json({ 
        success: false, 
        error: '该手机号尚未入驻，请先完成入驻流程',
        needRegister: true 
      }, { status: 400 });
    }

    // 🔒 解密敏感字段后返回
    const safeLawyer = decryptFields(lawyer, LAWYER_SENSITIVE_FIELDS);

    // 更新登录次数
    await supabase
      .from('lawyers')
      .update({ login_count: (lawyer.login_count || 0) + 1 })
      .eq('id', lawyer.id);

    // 🔑 通过 phone 查询对应的 users 表 ID，确保 token.id 始终是 users 表主键
    let userIdForToken = lawyer.user_id;
    if (!userIdForToken) {
      const { data: userRec } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();
      if (userRec) {
        userIdForToken = userRec.id;
        // 回写 user_id 到 lawyers 表，修复存量数据
        await supabase
          .from('lawyers')
          .update({ user_id: userRec.id })
          .eq('id', lawyer.id);
      }
    }

    // 生成登录 token（id 使用 users 表 ID，与 issue-token 保持一致）
    const token = generateToken({
      id: userIdForToken || lawyer.id,
      phone: safeLawyer.phone,
      userType: 'lawyer',
      lawyerId: lawyer.id,
    });

    return NextResponse.json({
      success: true,
      lawyer: { ...safeLawyer, login_count: (lawyer.login_count || 0) + 1 },
      token
    });
  } catch (error) {
    console.error('律师登录失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
