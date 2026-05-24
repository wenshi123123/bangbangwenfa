import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth } from '@/lib/auth/admin-middleware';
import { encryptFields, LAWYER_SENSITIVE_FIELDS } from '@/lib/crypto/encryption';

// GET /api/admin/lawyers - 获取律师列表
export async function GET(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
  }
  
  try {
    const supabase = getSupabaseAdmin();
    
    // 获取筛选参数
    const { searchParams } = new URL(request.url);
    const onlineStatusFilter = searchParams.get('onlineStatus');
    
    // 获取所有律师（不限状态，不限可接单）
    let query = supabase
      .from('lawyers')
      .select(`
        id,
        user_id,
        name,
        phone,
        wechat,
        title,
        intro,
        working_years,
        specialties,
        status,
        is_available,
        max_orders,
        current_orders,
        rating,
        online_status,
        created_at
      `)
      .order('created_at', { ascending: false });

    // 如果指定了在线状态筛选
    if (onlineStatusFilter && ['online', 'away'].includes(onlineStatusFilter)) {
      query = query.eq('online_status', onlineStatusFilter);
    }

    const { data: lawyers, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 查询订单统计
    const lawyerIds = (lawyers || []).map((l: { id: number }) => l.id);
    let orderStatsMap: Record<number, { total: number; pending: number; completed: number }> = {};
    
    if (lawyerIds.length > 0) {
      const { data: orders } = await supabase
        .from('consult_orders')
        .select('assigned_lawyer_id, status')
        .in('assigned_lawyer_id', lawyerIds);

      if (orders) {
        for (const order of orders) {
          const lid = order.assigned_lawyer_id;
          if (!orderStatsMap[lid]) {
            orderStatsMap[lid] = { total: 0, pending: 0, completed: 0 };
          }
          orderStatsMap[lid].total++;
          if (order.status === 'completed') {
            orderStatsMap[lid].completed++;
          } else if (order.status !== 'cancelled') {
            orderStatsMap[lid].pending++;
          }
        }
      }
    }

    // 转换字段名以匹配前端接口
    const data = (lawyers || []).map((lawyer: Record<string, unknown>) => ({
      id: lawyer.id,
      user_id: lawyer.user_id,
      name: lawyer.name,
      phone: lawyer.phone,
      wechat_id: lawyer.wechat || '',    // 前端用 wechat_id
      wechat: lawyer.wechat,
      title: lawyer.title || '',
      intro: lawyer.intro || '',
      working_years: lawyer.working_years || 0,
      specialties: typeof lawyer.specialties === 'string'
        ? (() => { try { return JSON.parse(lawyer.specialties as string); } catch { return [lawyer.specialties]; } })()
        : (lawyer.specialties || []),
      is_active: lawyer.status === 'active',
      is_available: lawyer.is_available ?? true,
      max_orders: lawyer.max_orders,
      current_orders: lawyer.current_orders,
      rating: lawyer.rating,
      online_status: lawyer.online_status || 'away',
      created_at: lawyer.created_at,
      stats: orderStatsMap[lawyer.id as number] || { total: 0, pending: 0, completed: 0 },
    }));

    return NextResponse.json({ 
      success: true, 
      data,
    });
  } catch (error) {
    console.error('获取律师列表失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// POST /api/admin/lawyers - 管理员添加律师
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, wechatId, phone, title, specialties, workingYears, intro } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: '姓名不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let lawyerData: Record<string, unknown> = {
      name,
      phone: phone || null,
      wechat: wechatId || null,
      title: title || '专职律师',
      intro: intro || null,
      working_years: workingYears || 0,
      specialties: Array.isArray(specialties) ? specialties : [],
      status: 'active',
      is_available: true,
      max_orders: 50,
      current_orders: 0,
      rating: 5.0,
      response_rate: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 加密敏感字段
    lawyerData = encryptFields(lawyerData, LAWYER_SENSITIVE_FIELDS);

    const { data: inserted, error } = await supabase
      .from('lawyers')
      .insert(lawyerData)
      .select('id, name')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '添加成功', data: inserted });
  } catch (error) {
    console.error('添加律师失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
