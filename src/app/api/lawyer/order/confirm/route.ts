import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  // 确保是律师类型
  if (auth.userType !== 'lawyer') {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }
  
  const lawyerId = auth.lawyerId!;
  
  try {
    const { orderId, action } = await request.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: '缺少订单ID' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // 先查询订单当前状态
    const { data: existing, error: queryError } = await supabase
      .from('consult_orders')
      .select('id, assigned_lawyer_id, assignment_status')
      .eq('id', orderId)
      .maybeSingle();
    
    if (queryError || !existing) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }
    
    // 权限校验：验证订单是否已分配给当前律师（String 包裹处理类型不一致）
    if (existing.assigned_lawyer_id != null && String(existing.assigned_lawyer_id) !== String(lawyerId)) {
      console.error('权限校验失败: 订单已分配给其他律师', { 
        orderId, 
        existingLawyerId: existing.assigned_lawyer_id,
        existingLawyerIdType: typeof existing.assigned_lawyer_id,
        requestLawyerId: lawyerId,
        requestLawyerIdType: typeof lawyerId,
      });
      return NextResponse.json({ success: false, error: '无权操作此订单' }, { status: 403 });
    }
    
    // 状态校验：只有 pending 或 confirmed 状态才能确认
    if (existing.assignment_status === 'completed' || existing.assignment_status === 'cancelled') {
      return NextResponse.json({ success: false, error: '订单状态不允许操作' }, { status: 400 });
    }
    
    // 根据 action 区分接单/拒单
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (action === 'reject') {
      updateData.assigned_lawyer_id = null;
      updateData.assignment_status = 'unassigned';
    } else {
      // accept（默认）
      updateData.assigned_lawyer_id = lawyerId;
      updateData.assignment_status = 'confirmed';
      updateData.confirmed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('consult_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: action === 'reject' ? '已拒单' : '已接单',
      order: data,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
