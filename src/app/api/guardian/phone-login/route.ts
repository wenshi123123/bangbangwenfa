import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { verifyCode } from '@/lib/sms/verify-code';
import { generateToken } from '@/lib/auth/token';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { randomBytes } from 'crypto';

// 生成邀请码
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'GUD-';
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

// POST /api/guardian/phone-login - 守护者手机号登录/注册
export async function POST(request: NextRequest) {
  try {
    // 限流：同一 IP 5次/分钟
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`${clientIP}:guardian-login`, 5, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '登录尝试过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { phone, code } = body;

    // 参数校验
    if (!phone || !code) {
      return NextResponse.json({ 
        success: false, 
        error: '请输入手机号和验证码' 
      }, { status: 400 });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ 
        success: false, 
        error: '请输入正确的手机号' 
      }, { status: 400 });
    }

    // 验证验证码
    const verifyResult = await verifyCode(phone, code, 'login');
    if (!verifyResult.valid) {
      return NextResponse.json({ 
        success: false, 
        error: verifyResult.reason || '验证码错误'
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 查找或创建守护者
    let { data: guardian, error: queryError } = await supabase
      .from('guardian_users')
      .select('*')
      .eq('phone', phone)
      .single();

    let isNewUser = false;

    if (queryError && queryError.code === 'PGRST116') {
      // 守护者不存在，创建新的
      isNewUser = true;
      
      // 生成唯一邀请码
      let inviteCode = generateInviteCode();
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('guardian_users')
          .select('id')
          .eq('invite_code', inviteCode)
          .single();
        
        if (!existing) break;
        inviteCode = generateInviteCode();
        attempts++;
      }

      // 创建新守护者
      const { data: newGuardian, error: createError } = await supabase
        .from('guardian_users')
        .insert([{
          phone,
          openid: `phone_${phone}`,
          nickname: `用户${phone.slice(-4)}`,
          invite_code: inviteCode,
          total_invites: 0,
          valid_invites: 0,
          total_commission: 0,
          available_commission: 0,
          withdrawn_commission: 0,
          status: 'active'
        }])
        .select()
        .single();

      if (createError) {
        console.error('创建守护者失败:', createError);
        return NextResponse.json({ 
          success: false, 
          error: '创建守护者失败' 
        }, { status: 500 });
      }

      guardian = newGuardian;
    } else if (queryError) {
      console.error('查询守护者失败:', queryError);
      return NextResponse.json({ 
        success: false, 
        error: '查询失败' 
      }, { status: 500 });
    }

    // 生成 JWT token（id 为 guardian_users 主键，guardianId 独立传入）
    const token = generateToken({
      id: guardian!.id,
      phone: guardian!.phone,
      userType: 'guardian',
      guardianId: guardian!.id,
    });

    // 返回登录结果
    return NextResponse.json({ 
      success: true, 
      data: {
        id: guardian!.id,
        phone: guardian!.phone,
        nickname: guardian!.nickname,
        avatar_url: guardian!.avatar_url,
        invite_code: guardian!.invite_code,
        total_invites: guardian!.total_invites,
        valid_invites: guardian!.valid_invites,
        total_commission: guardian!.total_commission,
        available_commission: guardian!.available_commission,
        withdrawn_commission: guardian!.withdrawn_commission,
        token
      },
      isNewUser
    });

  } catch (error) {
    console.error('守护者登录失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '登录失败，请重试' 
    }, { status: 500 });
  }
}
