import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// 通知类型枚举
export type NotificationType = 
  | 'order_created'      // 订单已创建
  | 'order_paid'          // 订单已支付
  | 'lawyer_accepted'     // 律师已接单
  | 'lawyer_response'     // 律师已回复
  | 'order_completed'     // 订单已完成
  | 'commission_approved' // 分成已发放
  | 'commission_rejected'  // 分成已拒绝
  | 'withdrawal_processing' // 提现处理中
  | 'withdrawal_completed'  // 提现已完成
  | 'withdrawal_rejected'   // 提现已拒绝
  | 'lawyer_review_passed'  // 律师入驻通过
  | 'lawyer_review_failed'  // 律师入驻被拒
  | 'system_notice';        // 系统公告

// 通知类型对应的默认标题和内容模板
const notificationTemplates: Record<NotificationType, { title: string; contentTemplate: string }> = {
  order_created: { title: '订单已创建', contentTemplate: '您的咨询订单 #{orderId} 已创建，请完成支付' },
  order_paid: { title: '订单已支付', contentTemplate: '订单 #{orderId} 已支付成功，律师即将为您服务' },
  lawyer_accepted: { title: '律师已接单', contentTemplate: '律师 {lawyerName} 已接单，开始为您服务' },
  lawyer_response: { title: '律师回复', contentTemplate: '律师对您的订单 #{orderId} 有了新回复' },
  order_completed: { title: '订单已完成', contentTemplate: '订单 #{orderId} 已完成，感谢您的信任' },
  commission_approved: { title: '分成已到账', contentTemplate: '恭喜！您获得 ¥{amount} 分成奖励，已到可提现余额' },
  commission_rejected: { title: '分成未通过', contentTemplate: '抱歉，订单 #{orderId} 的分成未通过审核：{reason}' },
  withdrawal_processing: { title: '提现处理中', contentTemplate: '您的 ¥{amount} 提现申请已提交，预计 {days} 到账' },
  withdrawal_completed: { title: '提现已到账', contentTemplate: '¥{amount} 已到账，请查收' },
  withdrawal_rejected: { title: '提现被拒绝', contentTemplate: '您的提现申请被拒绝：{reason}' },
  lawyer_review_passed: { title: '入驻审核通过', contentTemplate: '恭喜！您的律师入驻申请已通过审核' },
  lawyer_review_failed: { title: '入驻审核未通过', contentTemplate: '抱歉，您的律师入驻申请未通过：{reason}' },
  system_notice: { title: '系统公告', contentTemplate: '{content}' }
};

// POST /api/notifications/create - 创建通知（管理员接口）
export async function POST(request: NextRequest) {
  // 管理员认证检查
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  try {
    const body = await request.json();
    const { user_id, type, title, content, data } = body;

    if (!user_id || !type || !content) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数：user_id, type, content' 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 使用模板或自定义标题
    const finalTitle = title || notificationTemplates[type as NotificationType]?.title || '通知';
    
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title: finalTitle,
        content,
        data: data || {},
        is_read: false
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
