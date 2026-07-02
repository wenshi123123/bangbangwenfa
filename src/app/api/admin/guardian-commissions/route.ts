import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

export async function GET(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const rawSearch = searchParams.get('search')?.trim() || '';
    const offset = (page - 1) * limit;
    
    const supabase = getSupabaseAdmin();
    let commissionQuery = supabase
      .from('guardian_commissions')
      .select('id, guardian_id, order_id, commission_amount, commission_rate, status, admin_note, created_at, processed_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (status) commissionQuery = commissionQuery.eq('status', status);

    if (rawSearch) {
      const keyword = rawSearch.replace(/[%]/g, '').replace(/,/g, ' ').trim();
      const maybeId = Number(keyword);
      const guardianIds: string[] = [];
      const orderIds: number[] = [];

      const [guardianSearchRes, orderSearchRes] = await Promise.all([
        supabase
          .from('guardian_users')
          .select('id')
          .or(`nickname.ilike.%${keyword}%,invite_code.ilike.%${keyword}%`),
        supabase
          .from('consult_orders')
          .select('id')
          .or(`case_title.ilike.%${keyword}%,contact_name.ilike.%${keyword}%,order_no.ilike.%${keyword}%`),
      ]);

      if (!guardianSearchRes.error && guardianSearchRes.data) {
        guardianIds.push(...guardianSearchRes.data.map((item) => String(item.id)));
      }
      if (!orderSearchRes.error && orderSearchRes.data) {
        orderIds.push(...orderSearchRes.data.map((item) => Number(item.id)).filter((id) => !Number.isNaN(id)));
      }

      if (!Number.isNaN(maybeId) && maybeId > 0) {
        orderIds.push(maybeId);
      }

      const uniqueGuardianIds = [...new Set(guardianIds)];
      const uniqueOrderIds = [...new Set(orderIds)];

      const searchClauses: string[] = [];
      if (uniqueGuardianIds.length > 0) {
        searchClauses.push(`guardian_id.in.(${uniqueGuardianIds.join(',')})`);
      }
      if (uniqueOrderIds.length > 0) {
        searchClauses.push(`order_id.in.(${uniqueOrderIds.join(',')})`);
      }
      if (searchClauses.length === 0 && !Number.isNaN(maybeId) && maybeId > 0) {
        searchClauses.push(`id.eq.${maybeId}`);
      }

      if (searchClauses.length > 0) {
        commissionQuery = commissionQuery.or(searchClauses.join(','));
      } else {
        commissionQuery = commissionQuery.eq('id', -1);
      }
    }

    const query = commissionQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const commissions = data || [];
    const guardianIds = [...new Set(commissions.map((item) => item.guardian_id).filter(Boolean))];
    const orderIds = [...new Set(commissions.map((item) => item.order_id).filter(Boolean))];

    const [guardianResult, orderResult] = await Promise.all([
      guardianIds.length > 0
        ? supabase.from('guardian_users').select('id, nickname, invite_code, user_id').in('id', guardianIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nickname: string; invite_code: string | null; user_id: number | null }> }),
      orderIds.length > 0
        ? supabase.from('consult_orders').select('id, case_title, contact_name, service_price').in('id', orderIds)
        : Promise.resolve({ data: [] as Array<{ id: string; case_title: string | null; contact_name: string | null; service_price: number | null }> }),
    ]);

    const guardianMap = new Map((guardianResult.data || []).map((guardian) => [String(guardian.id), guardian]));
    const orderMap = new Map((orderResult.data || []).map((order) => [String(order.id), order]));

    const result = commissions.map((item) => ({
      ...item,
      guardian: guardianMap.get(String(item.guardian_id)) || null,
      order: orderMap.get(String(item.order_id)) || null,
    }));

    return NextResponse.json({ success: true, data: result, total: count || 0, page, limit });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 辅助函数：发送通知
async function sendNotification(supabase: any, userId: string, type: string, data: any) {
  try {
    const templates: Record<string, { title: string; content: string }> = {
      commission_approved: {
        title: '分成已到账',
        content: `恭喜！您获得 ¥${(data.amount / 100).toFixed(2)} 分成奖励，已到可提现余额`
      },
      commission_rejected: {
        title: '分成未通过',
        content: `抱歉，您订单的分润未通过审核。原因：${data.reason || '不符合分润条件'}`
      },
    };
    const template = templates[type];
    if (template) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title: template.title,
        content: template.content,
        related_id: data.orderId || null,
        is_read: false,
      });
    }
  } catch (e) {
    console.error('发送通知失败:', e);
  }
}

export async function PUT(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const body = await request.json();
    const { id, status, adminNote } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const updates: Record<string, unknown> = { status };
    if (adminNote) updates.admin_note = adminNote;
    if (status === 'approved' || status === 'rejected') {
      updates.processed_at = new Date().toISOString();
    }

    // 先查询分成记录
    const { data: commission, error: queryError } = await supabase
      .from('guardian_commissions')
      .select('guardian_id, commission_amount, order_id')
      .eq('id', id)
      .single();

    if (queryError || !commission) {
      return NextResponse.json({ success: false, error: '查询分成记录失败' }, { status: 500 });
    }

    // 如果审核通过，更新守护者余额
    if (status === 'approved') {
      // 查询守护者当前余额
      const { data: guardian, error: guardianError } = await supabase
        .from('guardian_users')
        .select('total_commission, available_commission, user_id')
        .eq('id', commission.guardian_id)
        .single();

      if (guardianError || !guardian) {
        return NextResponse.json({ success: false, error: '查询守护者失败' }, { status: 500 });
      }

      // 更新守护者余额
      const { error: updateError } = await supabase
        .from('guardian_users')
        .update({
          total_commission: (guardian.total_commission || 0) + commission.commission_amount,
          available_commission: (guardian.available_commission || 0) + commission.commission_amount
        })
        .eq('id', commission.guardian_id);

      if (updateError) {
        return NextResponse.json({ success: false, error: '更新守护者余额失败' }, { status: 500 });
      }

      // 发送通知：分成已发放
      if (guardian.user_id) {
        await sendNotification(supabase, guardian.user_id, 'commission_approved', {
          amount: commission.commission_amount,
          orderId: commission.order_id,
        });
      }
    } else if (status === 'rejected') {
      // 发送通知：分成被拒绝
      const { data: guardian } = await supabase
        .from('guardian_users')
        .select('user_id')
        .eq('id', commission.guardian_id)
        .single();

      if (guardian?.user_id) {
        await sendNotification(supabase, String(guardian.user_id), 'commission_rejected', {
          reason: adminNote || '不符合分润条件',
          orderId: commission.order_id,
        });
      }
    }

    const { data, error } = await supabase
      .from('guardian_commissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
