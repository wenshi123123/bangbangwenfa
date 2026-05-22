import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// GET /api/admin/analytics/export - 数据导出
export async function GET(request: NextRequest) {
  // 验证管理员权限
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'orders'; // orders, users, commissions
    const format = searchParams.get('format') || 'json'; // json, csv
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const supabase = getSupabaseAdmin();

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'orders':
        filename = 'orders';
        let ordersQuery = supabase
          .from('consult_orders')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
        if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate + 'T23:59:59');
        
        const { data: ordersData } = await ordersQuery;
        data = ordersData?.map(order => ({
          订单号: order.order_no,
          客户姓名: order.contact_name,
          联系电话: order.contact_phone,
          案件类型: order.case_type,
          案件标题: order.case_title,
          服务类型: order.service_type,
          订单金额: (order.service_price || 0) / 100,
          订单状态: order.status,
          支付状态: order.payment_status,
          创建时间: order.created_at,
        })) || [];
        break;

      case 'users':
        filename = 'users';
        let usersQuery = supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (startDate) usersQuery = usersQuery.gte('created_at', startDate);
        if (endDate) usersQuery = usersQuery.lte('created_at', endDate + 'T23:59:59');
        
        const { data: usersData } = await usersQuery;
        data = usersData?.map(user => ({
          用户ID: user.id,
          昵称: user.nickname,
          手机号: user.phone,
          邀请码: user.invite_code || '-',
          创建时间: user.created_at,
        })) || [];
        break;

      case 'commissions':
        filename = 'commissions';
        let commissionsQuery = supabase
          .from('guardian_commissions')
          .select(`
            *,
            guardian:guardian_users(nickname, invite_code),
            order:consult_orders(order_no, contact_name)
          `)
          .order('created_at', { ascending: false });
        
        if (startDate) commissionsQuery = commissionsQuery.gte('created_at', startDate);
        if (endDate) commissionsQuery = commissionsQuery.lte('created_at', endDate + 'T23:59:59');
        
        const { data: commissionsData } = await commissionsQuery;
        data = commissionsData?.map(c => ({
          订单号: c.order?.order_no || '-',
          客户姓名: c.order?.contact_name || '-',
          守护者: c.guardian?.nickname || '-',
          邀请码: c.guardian?.invite_code || '-',
          分成金额: (c.commission_amount || 0) / 100,
          分成比例: c.commission_rate + '%',
          状态: c.status === 'approved' ? '已发放' : c.status === 'pending' ? '待审核' : '已拒绝',
          创建时间: c.created_at,
          处理时间: c.processed_at || '-',
        })) || [];
        break;

      default:
        return NextResponse.json({ success: false, error: '无效的导出类型' }, { status: 400 });
    }

    if (format === 'csv') {
      if (data.length === 0) {
        return NextResponse.json({ success: false, error: '无数据可导出' }, { status: 400 });
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(h => {
            const val = String(row[h] || '');
            // CSV转义：包含逗号、引号或换行符的字段需要加引号
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          }).join(',')
        )
      ];

      const csvContent = csvRows.join('\n');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total: data.length,
        type,
        format,
        exportTime: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('导出数据失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
