import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// POST /api/notifications/read - 标记通知已读
export async function POST(request: NextRequest) {
  // 认证检查
  const auth = authenticateRequest(request);
  if (!auth || !auth.success) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  try {
    const body = await request.json();
    const { notification_id, mark_all } = body;

    // 使用认证的用户ID
    const userId = auth.user?.id;
    const supabase = getSupabaseAdmin();

    if (mark_all) {
      // 标记该用户所有通知为已读
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('标记全部已读失败:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '全部已读' });
    }

    if (notification_id) {
      // 标记单条通知为已读 - 需要验证归属
      const { data: notification } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('id', notification_id)
        .single();

      if (!notification || notification.user_id !== userId) {
        return NextResponse.json({ success: false, error: '通知不存在或无权操作' }, { status: 403 });
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification_id);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '已标记为已读' });
    }

    return NextResponse.json({ success: false, error: '请提供 notification_id 或 mark_all 参数' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
