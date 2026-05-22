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
    const { target_type, target_ids, title, content, user_type } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: '标题和内容不能为空' }, { status: 400 });
    }

    let userIds: string[] = [];

    // 根据目标类型确定要发送的用户
    switch (target_type) {
      case 'all_users':
        // 所有用户
        const { data: users } = await supabase
          .from('users')
          .select('id');
        userIds = users?.map(u => u.id) || [];
        break;

      case 'all_guardians':
        // 所有守护者
        const { data: guardians } = await supabase
          .from('guardian_users')
          .select('user_id');
        userIds = guardians?.map(g => g.user_id).filter(Boolean) || [];
        break;

      case 'all_lawyers':
        // 所有律师
        const { data: lawyers } = await supabase
          .from('lawyers')
          .select('user_id');
        userIds = lawyers?.map(l => l.user_id).filter(Boolean) || [];
        break;

      case 'specific':
        // 指定用户
        userIds = target_ids || [];
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

    // 分批插入（每批100条）
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const { error } = await supabase
        .from('notifications')
        .insert(batch);
      
      if (!error) {
        inserted += batch.length;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `成功发送 ${inserted} 条通知` 
    });
  } catch (error) {
    console.error('批量发送通知失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
