import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { generateToken } from '@/lib/auth/token';

/**
 * POST /api/lawyer/issue-token
 * 为已登录用户签发律师专用 token（userType='lawyer'）
 * 要求：用户已持有有效 token（任意类型）且已通过律师审核
 */
export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const userId = auth.userId!;
  const userPhone = auth.phone;

  try {
    const supabase = getSupabaseAdmin();

    // 先通过 user_id 查找律师
    let { data: lawyer } = await supabase
      .from('lawyers')
      .select('id, phone, status')
      .eq('user_id', userId.toString())
      .eq('status', 'active')
      .maybeSingle();

    // 如果没找到，通过 phone 兜底查找
    if (!lawyer && userPhone) {
      const { data: phoneMatch } = await supabase
        .from('lawyers')
        .select('id, phone, status')
        .eq('phone', userPhone)
        .eq('status', 'active')
        .maybeSingle();
      lawyer = phoneMatch;
    }

    if (!lawyer) {
      return NextResponse.json(
        { success: false, error: '该用户不是认证律师' },
        { status: 403 }
      );
    }

    // 签发律师专用 token
    const token = generateToken({
      id: userId,
      phone: userPhone || lawyer.phone,
      userType: 'lawyer',
      lawyerId: lawyer.id,
    });

    return NextResponse.json({ success: true, token, lawyerId: lawyer.id });
  } catch (error) {
    console.error('签发律师token失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
