import { NextResponse } from 'next/server';

const LOCAL_PREVIEW_JWT_SECRET = 'e9d1791af41074a5d3dcbf82325c10bf4c5b2e1e9a8f736c6d1f09ae1a5c0e4b9d2ea4c977a8f5b1c6d8e2031f7a9b4c2d6e8f0a1b3c5d7e9f1029384756abcd';

export function isLocalRolePreviewEnabled(): boolean {
  return process.env.DEPLOY_ENV !== 'PROD' && process.env.NODE_ENV !== 'production';
}

export function getLocalPreviewJwtSecret(): string | null {
  return isLocalRolePreviewEnabled() ? LOCAL_PREVIEW_JWT_SECRET : null;
}

export function localPreviewNotFoundResponse(): NextResponse {
  return new NextResponse(null, { status: 404 });
}
