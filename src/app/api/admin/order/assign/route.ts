import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { sendOrderNotificationSms, isSmsConfigured } from '@/lib/sms/tencent';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

/**
 * 发送派单通知给律师（短信通知）
 */
async function notifyLawyerOfNewOrder(
  supabase: any,
  lawyerId: number,
  orderId: number,
  orderNo: string,
  orderTitle: string
): Promise<{ success: boolean; notified: boolean; error?: string }> {
  try {
    // 获取律师信息（包含手机号）
    const { data: lawyer } = await supabase
      .from('lawyers')
      .select('name, phone')
      .eq('id', lawyerId)
      .single();

    if (!lawyer) {
      console.warn(`派单通知失败: 律师 ${lawyerId} 不存在`);
      return { success: false, notified: false, error: '律师不存在' };
    }

    // 如果有律师手机号，发送短信通知
    if (lawyer.phone) {
      try {
        const result = await sendOrderNotificationSms(
          lawyer.phone,
          orderNo,
          orderTitle || '法律咨询订单'
        );

        if (result.success) {
          console.log(`✅ 短信通知已发送: 律师 ${lawyer.name} (${lawyer.phone}) 收到新订单 ${orderNo}`);
        } else {
          console.warn(`⚠️ 短信通知发送失败: 律师 ${lawyer.name}, 错误: ${result.error}`);
        }
      } catch (notifyError: any) {
        console.error('发送短信通知异常:', notifyError);
        // 短信通知失败不影响派单结果
      }
    } else {
      console.log(`📋 派单通知: 律师 ${lawyer.name} (${lawyerId}) 收到新订单 ${orderNo} (无手机号，仅记录)`);
    }

    // 记录通知到数据库（用于管理后台查看）
    await supabase
      .from('notifications')
      .insert({
        user_type: 'lawyer',
        user_id: lawyerId,
        title: '新订单提醒',
        content: `您有一个新的咨询订单：${orderTitle}，请及时处理。`,
        type: 'order_assigned',
        related_id: orderId,
      });

    return { success: true, notified: !!lawyer.phone };
  } catch (error: any) {
    console.error('发送派单通知失败:', error);
    // 通知失败不影响派单结果
    return { success: true, notified: false, error: error.message };
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(req);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  try {
    const { orderId, lawyerId } = await req.json();

    if (!orderId || !lawyerId) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少 orderId 或 lawyerId' 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 获取订单信息（用于通知内容）
    const { data: order } = await supabase
      .from('consult_orders')
      .select('id, order_no, case_title, case_type, category')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ 
        success: false, 
        error: '订单不存在' 
      }, { status: 404 });
    }

    // 更新订单的派单信息
    const { error: updateError } = await supabase
      .from('consult_orders')
      .update({
        assigned_lawyer_id: lawyerId,
        status: 'assigned',
        assignment_status: 'pending',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // 获取律师姓名
    const { data: lawyer } = await supabase
      .from('lawyers')
      .select('name')
      .eq('id', lawyerId)
      .single();

    console.log(`✅ 订单 ${orderId} 已成功派单给律师 ${lawyer?.name || lawyerId}`);

    // 发送通知给律师（真正发送微信模板消息）
    const notifyResult = await notifyLawyerOfNewOrder(
      supabase,
      lawyerId,
      orderId,
      order.order_no,
      order.case_title || '法律咨询订单'
    );

    return NextResponse.json({ 
      success: true, 
      message: '派单成功',
      lawyer_name: lawyer?.name || '指定律师',
      notified: notifyResult.notified,
    });

  } catch (err: any) {
    console.error('派单失败:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || '派单失败，请稍后重试' 
    }, { status: 500 });
  }
}
