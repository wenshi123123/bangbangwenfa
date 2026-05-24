import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { decryptFields, encryptFields, LAWYER_SENSITIVE_FIELDS } from '@/lib/crypto/encryption';

export async function GET(request: NextRequest) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  // 🔧 确保有律师ID（不再死卡 userType，兼容既有用户即是律师的场景）
  const lawyerId = auth.lawyerId;
  if (!lawyerId) {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }
  
  try {
    const supabase = getSupabaseAdmin();
    
    // 优先用 lawyerId 查询（UUID from lawyers表）
    let { data, error } = await supabase
      .from('lawyers')
      .select('id, phone, name, real_name, nickname, avatar_url, wechat, email, title, intro, specialties, member_expires_at, member_starting_at, is_available, max_orders, current_orders, rating, response_rate, status, license_no, working_years, province, city, specialization, bio, created_at, updated_at, user_id')
      .eq('id', String(lawyerId))
      .maybeSingle();
    
    // 🔧 兜底：如果 lawyerId 匹配不上（如旧 token 存的是整数 ID），按 user_id 查询
    if (!data && !error && auth.userId) {
      const fallback = await supabase
        .from('lawyers')
        .select('id, phone, name, real_name, nickname, avatar_url, wechat, email, title, intro, specialties, member_expires_at, member_starting_at, is_available, max_orders, current_orders, rating, response_rate, status, license_no, working_years, province, city, specialization, bio, created_at, updated_at, user_id')
        .eq('user_id', auth.userId)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
    
    if (error || !data) {
      return NextResponse.json({ success: false, error: error?.message || '律师不存在' }, { status: 404 });
    }
    
    // 查询统计数据
    const { count: totalCount } = await supabase
      .from('consult_orders')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_lawyer_id', data.id);
    
    const { count: pendingCount } = await supabase
      .from('consult_orders')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_lawyer_id', data.id)
      .eq('assignment_status', 'pending');
    
    const total = totalCount || 0;
    const pending = pendingCount || 0;
    
    // 🔒 解密敏感字段后返回
    const safeData = decryptFields(data, LAWYER_SENSITIVE_FIELDS);
    
    return NextResponse.json({ 
      success: true,
      _v: 'v2-explicit-columns',
      data: {
        ...safeData,
        stats: {
          total: total,
          pending: pending,
          completed: total - pending
        }
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-API-Version': 'v2-explicit-columns',
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  // 🔧 确保有律师ID
  const lawyerId = auth.lawyerId;
  if (!lawyerId) {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    
    // 白名单：仅允许更新以下字段，防止注入 status/id 等敏感字段
    const ALLOWED_FIELDS = [
      'nickname', 'real_name', 'avatar_url', 'province', 'city',
      'specialization', 'bio', 'license_no', 'phone', 'wechat',
      'title', 'intro', 'working_years', 'email',
    ];
    
    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: '无有效更新字段' }, { status: 400 });
    }

    // 🔒 加密敏感字段后再写入
    const encryptedUpdates = encryptFields(updates, LAWYER_SENSITIVE_FIELDS);
    
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lawyers')
      .update(encryptedUpdates)
      .eq('id', String(lawyerId))
      .select()
      .maybeSingle();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    // 🔒 解密后返回
    return NextResponse.json({ success: true, lawyer: data ? decryptFields(data, LAWYER_SENSITIVE_FIELDS) : null });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
