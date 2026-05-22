import { NextRequest, NextResponse } from 'next/server';
import { clearRateLimit, getRateLimitStatus } from '@/lib/sms/verify-code';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

/**
 * GET /api/admin/sms-rate-limit?phone=xxx
 * 获取指定手机号的频率限制状态
 */
export async function GET(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    
    if (!phone) {
      return NextResponse.json({
        success: false,
        error: '请提供手机号参数'
      }, { status: 400 });
    }
    
    const status = getRateLimitStatus(phone);
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[SMS Rate Limit] Error:', error);
    return NextResponse.json({
      success: false,
      error: '获取频率限制状态失败'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/sms-rate-limit?phone=xxx
 * 清理指定手机号的频率限制（不传phone则清理所有）
 */
export async function DELETE(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    
    const result = await clearRateLimit(phone || undefined);
    
    return NextResponse.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('[SMS Rate Limit] Error:', error);
    return NextResponse.json({
      success: false,
      error: '清理频率限制失败'
    }, { status: 500 });
  }
}
