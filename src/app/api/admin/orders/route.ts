import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';

// GET /api/admin/orders - 获取订单列表（重定向到 /api/admin/order/list）
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }
  
  // 重定向到正确的接口
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const redirectUrl = `/api/admin/order/list${searchParams ? '?' + searchParams : ''}`;
  
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
