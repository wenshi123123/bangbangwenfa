import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// GET /api/notifications/list - 获取用户通知列表
export async function GET(request: NextRequest) {
  // 认证检查
  const auth = authenticateRequest(request);
  if (!auth || !auth.success) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 可选：筛选类型
    const isRead = searchParams.get('is_read'); // 可选：已读/未读
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');

    // 使用认证的用户ID，不允许查询其他用户
    const userId = auth.user?.id;

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 类型筛选 - 支持单类型或分类
    if (type) {
      // 分类映射
      const categoryMap: Record<string, string[]> = {
        order: ['order_created', 'order_paid', 'lawyer_accepted', 'lawyer_response', 'order_completed'],
        commission: ['commission_approved', 'commission_rejected'],
        withdrawal: ['withdrawal_processing', 'withdrawal_completed', 'withdrawal_rejected'],
        lawyer: ['lawyer_review_passed', 'lawyer_review_failed'],
        system: ['system_notice']
      };

      if (categoryMap[type]) {
        query = query.in('type', categoryMap[type]);
      } else {
        query = query.eq('type', type);
      }
    }

    // 已读/未读筛选
    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true');
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        list: data || [],
        total: count || 0,
        page,
        pageSize
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
