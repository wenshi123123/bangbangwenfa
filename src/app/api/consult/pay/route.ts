import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// 支付状态查询 API 限流：每分钟 20 次
const PAY_RATE_LIMIT = 20;
const PAY_WINDOW_MS = 60000;

/**
 * POST /api/consult/pay
 * 
 * 🔒 安全修复：此接口现仅做"支付状态查询"，不再允许直接标记订单为已支付。
 * 订单支付状态只能由微信支付回调（/api/pay/callback）在有签名验证的情况下更新。
 * 
 * 用途：前端轮询检查订单是否已被微信支付回调更新为已支付。
 */
export async function POST(request: NextRequest) {
  try {
    // 必须登录才能操作支付
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }

    // 限流检查
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`${clientIP}:pay-status`, PAY_RATE_LIMIT, PAY_WINDOW_MS);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '缺少订单号' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 查询当前订单状态（只读，不更新）
    const { data: existing, error: queryError } = await supabase
      .from('consult_orders')
      .select('id, payment_status, service_price')
      .eq('id', orderId)
      .maybeSingle();

    if (queryError) {
      console.error('查询订单失败:', queryError);
      return NextResponse.json(
        { success: false, error: '查询订单失败' },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    // 🔒 仅返回支付状态（只读），不更新任何数据
    // 实际支付状态更新仅由 /api/pay/callback（微信支付签名验证后）完成
    return NextResponse.json({
      success: true,
      data: {
        orderId: existing.id,
        paymentStatus: existing.payment_status,
        isPaid: existing.payment_status === 'paid',
        servicePrice: existing.service_price,
      }
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
