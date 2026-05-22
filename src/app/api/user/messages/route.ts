import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    
    const userId = auth.userId;
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    const supabase = getSupabaseClient();
    let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
    
    // 只能查看自己的消息
    query = query.eq('user_id', userId);
    if (orderId) query = query.eq('order_id', orderId);
    
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, messages: data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    
    const userId = auth.userId;
    const body = await request.json();
    
    // 确保消息归属当前用户
    const messageData = {
      ...body,
      user_id: userId
    };
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
