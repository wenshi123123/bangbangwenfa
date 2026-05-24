import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// POST /api/notifications/broadcast - 管理员批量发送通知
export async function POST(request: NextRequest) {
  // 管理员认证检查
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { target_type, target_ids, title, content, days } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: '标题和内容不能为空' }, { status: 400 });
    }

    let userIds: string[] = [];
    const daysRange = parseInt(String(days)) || 7;

    // 根据目标类型确定要发送的用户
    switch (target_type) {
      case 'all_users': {
        // 所有用户 — users.id 是 int, 需转为字符串匹配 notifications.user_id (varchar)
        const { data: users } = await supabase
          .from('users')
          .select('id');
        userIds = (users || []).map(u => String(u.id));
        break;
      }
      case 'all_guardians': {
        // 所有守护者
        const { data: guardians } = await supabase
          .from('guardian_users')
          .select('user_id');
        userIds = (guardians || []).map(g => String(g.user_id)).filter(Boolean);
        break;
      }
      case 'all_lawyers': {
        // 所有律师 — lawyers 表没有 user_id 列，通过 lawyer_applications 反查
        // lawyer_applications 存有 user_id (varchar)，且 review_status = 'approved'
        const { data: approvedApps } = await supabase
          .from('lawyer_applications')
          .select('user_id')
          .eq('review_status', 'approved');
        // 去重（同一个人可能有多个 application）
        const seen = new Set<string>();
        userIds = (approvedApps || [])
          .map(a => String(a.user_id))
          .filter(id => {
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        break;
      }
      case 'new_users': {
        // 最近 N 天内注册的新用户
        const since = new Date();
        since.setDate(since.getDate() - daysRange);
        const { data: newUsers } = await supabase
          .from('users')
          .select('id')
          .gte('created_at', since.toISOString());
        userIds = (newUsers || []).map(u => String(u.id));
        break;
      }
      case 'active_users': {
        // 有过订单交易的用户（去重）
        const { data: activeUserIds } = await supabase
          .from('consult_orders')
          .select('user_id')
          .eq('payment_status', 'paid');
        const seen = new Set<string>();
        userIds = (activeUserIds || [])
          .map(o => String(o.user_id))
          .filter(id => {
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        break;
      }
      case 'specific':
        // 指定用户
        userIds = (target_ids || []).map((id: string | number) => String(id));
        break;

      default:
        return NextResponse.json({ success: false, error: '无效的目标类型' }, { status: 400 });
    }

    if (userIds.length === 0) {
      return NextResponse.json({ success: false, error: '没有目标用户' }, { status: 400 });
    }

    // 批量创建通知
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'system_notice',
      title,
      content,
      is_read: false
    }));

    // 分批插入（每批100条），收集错误日志
    const batchSize = 100;
    let inserted = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const { error } = await supabase
        .from('notifications')
        .insert(batch);
      
      if (error) {
        errors.push(`批次${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({ 
      success: true,
      data: {
        sent_count: inserted,
        total_targets: userIds.length,
        message: inserted === userIds.length 
          ? `成功发送 ${inserted} 条通知`
          : `部分成功：已发送 ${inserted}/${userIds.length} 条通知`
      },
      message: `成功发送 ${inserted} 条通知`,
    });
  } catch (error) {
    console.error('批量发送通知失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
