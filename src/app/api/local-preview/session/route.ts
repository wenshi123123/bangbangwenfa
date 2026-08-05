import { NextRequest, NextResponse } from 'next/server';
import { isLocalRolePreviewEnabled, localPreviewNotFoundResponse } from '@/lib/local-preview/environment';
import { getLocalPreviewProfile, type LocalPreviewRole, resetLocalPreviewFixtures } from '@/lib/local-preview/fixtures';
import { generateToken } from '@/lib/auth/token';
import { generateAdminToken } from '@/lib/auth/admin-token';

const roles: LocalPreviewRole[] = ['user', 'guardian', 'lawyer', 'admin'];

export async function POST(request: NextRequest) {
  if (!isLocalRolePreviewEnabled()) return localPreviewNotFoundResponse();
  const body = await request.json().catch(() => null) as { action?: string; role?: LocalPreviewRole } | null;
  if (body?.action === 'reset') {
    resetLocalPreviewFixtures();
    return NextResponse.json({ success: true });
  }
  if (body?.action !== 'select' || !body.role || !roles.includes(body.role)) {
    return NextResponse.json({ success: false, error: '无效的本地测试操作' }, { status: 400 });
  }

  resetLocalPreviewFixtures();
  const profile = getLocalPreviewProfile(body.role);
  if (body.role === 'admin') {
    if (!profile.admin) return NextResponse.json({ success: false, error: '本地管理员资料缺失' }, { status: 500 });
    return NextResponse.json({ success: true, admin: profile.admin, adminToken: generateAdminToken(profile.admin.id, profile.admin.username), targetPath: profile.targetPath });
  }
  const userProfile = profile.user;
  if (!userProfile) return NextResponse.json({ success: false, error: '本地用户资料缺失' }, { status: 500 });
  const userType = userProfile.userType as 'user' | 'guardian' | 'lawyer';
  const token = generateToken({ id: userProfile.id, phone: userProfile.phone, username: userProfile.username || undefined, userType, guardianId: 'guardianId' in profile ? profile.guardianId : undefined, lawyerId: 'lawyerId' in profile ? profile.lawyerId : undefined, status: body.role === 'lawyer' ? 'active' : undefined });
  return NextResponse.json({ success: true, user: userProfile, token, targetPath: profile.targetPath });
}
