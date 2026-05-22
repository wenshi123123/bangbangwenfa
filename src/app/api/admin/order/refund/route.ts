import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  try {
    const body = await request.json();
    const { orderId } = body;
    
    if (!orderId) {
      return NextResponse.json({ success: false, error: '缺少订单ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. 查询订单信息，获取关联的守护者和分成金额
    const { data: order, error: orderError } = await supabase
      .from('consult_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    // 2. 检查是否已退款
    if (order.payment_status === 'refunded') {
      return NextResponse.json({ success: false, error: '订单已退款' }, { status: 400 });
    }

    // 3. 查询该订单对应的佣金记录
    const { data: commission } = await supabase
      .from('guardian_commissions')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .maybeSingle();

    // 4. 更新订单状态为已退款
    const { data: updatedOrder, error: updateError } = await supabase
      .from('consult_orders')
      .update({ 
        payment_status: 'refunded',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('更新订单失败:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // 5. 如果有佣金记录，执行回滚
    if (commission) {
      // 更新佣金状态为已取消
      await supabase
        .from('guardian_commissions')
        .update({
          status: 'cancelled',
          is_refunded: true,
          refunded_amount: commission.commission_amount,
          refunded_at: new Date().toISOString(),
          admin_note: `订单 ${orderId} 退款，佣金已回滚`
        })
        .eq('id', commission.id);

      // 扣除守护者的可用佣金
      const { data: guardian } = await supabase
        .from('guardian_users')
        .select('available_commission, total_commission')
        .eq('id', commission.guardian_id)
        .single();

      if (guardian) {
        const newAvailable = Math.max(0, guardian.available_commission - commission.commission_amount);
        const newTotal = Math.max(0, guardian.total_commission - commission.commission_amount);

        await supabase
          .from('guardian_users')
          .update({
            available_commission: newAvailable,
            total_commission: newTotal
          })
          .eq('id', commission.guardian_id);

        console.log(`退款回滚：守护者 ${commission.guardian_id} 佣金 ${commission.commission_amount} 已扣除`);
      }
    }

    console.log(`退款成功：订单 ${orderId} 已退款，佣金已回滚`);

    return NextResponse.json({ 
      success: true, 
      order: updatedOrder,
      message: commission ? '退款成功，佣金已回滚' : '退款成功'
    });

  } catch (error: any) {
    console.error('退款异常:', error);
    return NextResponse.json({ success: false, error: error.message || '服务器错误' }, { status: 500 });
  }
}
