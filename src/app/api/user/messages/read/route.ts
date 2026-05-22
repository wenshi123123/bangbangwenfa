import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    
    const userId = auth.user?.id;
    const body = await request.json();
    const { messageIds } = body;
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ success: false, error: '缺少消息ID' }, { status: 400 });
    }
    
    const supabase = getSupabaseClient();
    
    // 只能标记自己消息为已读
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', messageIds)
      .eq('user_id', userId);
      
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
