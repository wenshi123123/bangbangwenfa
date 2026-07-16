import { STATIC_ASSET_RECOVERY_PARAM } from '@/lib/build-meta';

export { STATIC_ASSET_RECOVERY_PARAM };

export const STATIC_ASSET_RECOVERY_KEY = '__bbwv_static_asset_recovery_once';

let fallbackRecoveryClaimed = false;

export type ResourceElementLike = {
  tagName?: string;
  src?: string;
  href?: string;
  currentSrc?: string;
  poster?: string;
  rel?: string;
};

export function isSameOriginNextStaticAsset(resourceUrl: string, pageOrigin: string) {
  try {
    const resource = new URL(resourceUrl, pageOrigin);
    return resource.origin === pageOrigin && resource.pathname.startsWith('/_next/static/');
  } catch {
    return false;
  }
}

export function buildStaticAssetRecoveryUrl(pageUrl: string, buildToken: string) {
  const target = new URL(pageUrl);
  target.searchParams.set('__bbwv', buildToken);
  target.searchParams.set(STATIC_ASSET_RECOVERY_PARAM, '1');
  return target.toString();
}

export function claimStaticAssetRecovery(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  if (storage.getItem(STATIC_ASSET_RECOVERY_KEY) === '1') {
    return false;
  }

  storage.setItem(STATIC_ASSET_RECOVERY_KEY, '1');
  return true;
}

export function claimStaticAssetRecoveryFromSession() {
  try {
    return claimStaticAssetRecovery(window.sessionStorage);
  } catch {
    if (fallbackRecoveryClaimed) {
      return false;
    }

    fallbackRecoveryClaimed = true;
    return true;
  }
}

export function getStaticResourceUrl(element: ResourceElementLike): string | null {
  switch (element.tagName?.toUpperCase()) {
    case 'SCRIPT':
      return element.src || null;
    case 'LINK':
      return element.rel?.toLowerCase() === 'stylesheet' ? element.href || null : null;
    case 'IMG':
    case 'SOURCE':
      return element.currentSrc || element.src || null;
    case 'VIDEO':
      return element.poster || null;
    default:
      return null;
  }
}
