import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

/**
 * GET /api/auth/session
 *
 * 仅用于前端启动时确认本地保存的令牌仍能被服务端验签。
 * 本地 user_info 只是展示资料，不能单独作为登录依据。
 */
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  return NextResponse.json({
    success: true,
    data: {
      id: auth.userId,
      phone: auth.phone,
      userType: auth.userType,
    },
  });
}
