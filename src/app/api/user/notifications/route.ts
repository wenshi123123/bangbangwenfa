import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

/**
 * GET /api/user/notifications
 * 获取当前用户的通知列表
 * query: ?unreadOnly=true | ?limit=20&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.success) return unauthorizedResponse(auth.error);

    const userId = auth.userId!;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);
    const offset = Number(searchParams.get('offset') || 0);

    const supabase = getSupabaseClient();
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) query = query.eq('is_read', false);

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: '查询通知失败' }, { status: 500 });
    }

    // 统计未读数
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return NextResponse.json({
      success: true,
      notifications: data || [],
      unreadCount: unreadCount || 0,
      total: count || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

/**
 * PATCH /api/user/notifications
 * 标记通知为已读
 * body: { ids: number[] } | { markAll: true }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.success) return unauthorizedResponse(auth.error);

    const userId = auth.userId!;
    const body = await request.json();
    const supabase = getSupabaseClient();

    if (body.markAll) {
      // 全部标记已读
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) {
        return NextResponse.json({ success: false, error: '查询通知失败' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: '已全部标记已读' });
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('id', body.ids);
      if (error) {
        return NextResponse.json({ success: false, error: '查询通知失败' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `已标记 ${body.ids.length} 条通知为已读` });
    }

    return NextResponse.json({ success: false, error: '无效参数' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
