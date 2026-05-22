/**
 * 律师入驻支付状态查询
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '订单号不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 通过订单号查找申请
    const { data: application, error } = await supabase
      .from('lawyer_applications')
      .select('payment_status')
      .eq('order_no', orderId)
      .single();

    if (error || !application) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: application.payment_status,
        isPaid: application.payment_status === 'paid',
      },
    });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}
