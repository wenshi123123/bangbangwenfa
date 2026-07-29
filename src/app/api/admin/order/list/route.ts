import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

type DisplayOrder = {
  id: string | number;
  order_type: 'consult' | 'lawyer_application';
  order_no: string | null;
  contact_name: string;
  contact_phone: string | null;
  case_type: string;
  case_title: string;
  service_type: string;
  service_price: number;
  payment_status: string;
  category: string;
  created_at: string;
};

function labelLawyerPackage(packageType?: string | null) {
  return packageType === 'criminal_premium' ? '刑事律师（臻选）' : '民事律师（臻选）';
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const rawSearch = searchParams.get('search')?.trim().toLowerCase() || '';
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '10', 10), 1), 100);
    const supabase = getSupabaseAdmin();

    let consultQuery: any = supabase
      .from('consult_orders')
      .select('id, user_id, order_no, contact_name, contact_phone, case_type, case_title, service_type, service_price, payment_status, category, created_at')
      .order('created_at', { ascending: false });
    let applicationQuery: any = supabase
      .from('lawyer_applications')
      .select('id, user_id, order_no, name, phone, package_type, package_price, payment_status, created_at')
      .order('created_at', { ascending: false });

    if (status) {
      consultQuery = consultQuery.eq('payment_status', status);
      applicationQuery = applicationQuery.eq('payment_status', status);
    }
    if (category === 'civil' || category === 'criminal') {
      consultQuery = consultQuery.eq('category', category);
    }
    if (category && category !== 'civil' && category !== 'criminal' && category !== 'lawyer_application') {
      return NextResponse.json({ success: true, data: { list: [], total: 0 } });
    }

    const [{ data: consultations, error: consultationError }, { data: applications, error: applicationError }] = await Promise.all([
      category === 'lawyer_application' ? Promise.resolve({ data: [], error: null }) : consultQuery,
      category && category !== 'lawyer_application' ? Promise.resolve({ data: [], error: null }) : applicationQuery,
    ]);
    if (consultationError || applicationError) {
      return NextResponse.json({ success: false, error: consultationError?.message || applicationError?.message || '查询订单失败' }, { status: 500 });
    }

    const userIds = [...new Set([
      ...(consultations || []).map((order: any) => order.user_id),
      ...(applications || []).map((application: any) => application.user_id),
    ].filter(Boolean).map(String))];
    const nicknameByUserId = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, nickname').in('id', userIds);
      for (const user of users || []) {
        if (typeof user.nickname === 'string' && user.nickname.trim()) nicknameByUserId.set(String(user.id), user.nickname.trim());
      }
    }

    const list: DisplayOrder[] = [
      ...(consultations || []).map((order: any): DisplayOrder => ({
        ...order,
        order_type: 'consult',
        contact_name: nicknameByUserId.get(String(order.user_id)) || '匿名用户',
        service_price: Number(order.service_price),
      })),
      ...(applications || []).map((application: any): DisplayOrder => ({
        id: application.id,
        order_type: 'lawyer_application',
        order_no: application.order_no,
        contact_name: nicknameByUserId.get(String(application.user_id)) || '匿名用户',
        contact_phone: application.phone || null,
        case_type: 'lawyer_application',
        case_title: labelLawyerPackage(application.package_type),
        service_type: application.package_type || 'lawyer_application',
        service_price: Number(application.package_price),
        payment_status: application.payment_status || 'pending',
        category: 'lawyer_application',
        created_at: application.created_at,
      })),
    ].filter((order) => !rawSearch || [
      order.contact_name,
      order.contact_phone,
      order.case_title,
      order.order_no,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(rawSearch)));

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const from = (page - 1) * pageSize;
    return NextResponse.json({ success: true, data: { list: list.slice(from, from + pageSize), total: list.length } });
  } catch (error) {
    console.error('获取后台订单失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
