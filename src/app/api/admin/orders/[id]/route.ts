import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';

// GET /api/admin/orders/[id] - 获取订单详情（重定向到 /api/admin/order/detail/[id]）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }
  
  const { id } = await params;
  return NextResponse.redirect(new URL(`/api/admin/order/detail/${id}`, request.url));
}
