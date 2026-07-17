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

/**
 * Runs before the Next.js runtime. This catches a missing stylesheet or script
 * even when the React recovery guards cannot be downloaded themselves.
 */
export function buildInlineStaticAssetRecoveryScript(buildToken: string) {
  const serializedBuildToken = JSON.stringify(buildToken);
  const serializedRecoveryParam = JSON.stringify(STATIC_ASSET_RECOVERY_PARAM);

  return `(() => {
  const recoveryKey = ${JSON.stringify(`${STATIC_ASSET_RECOVERY_KEY}_attempts`)};
  const recoveryAttemptParam = '__bbwv_attempt';
  const maxRecoveryAttempts = 3;

  const isBrokenNextStaticAsset = (target) => {
    const tagName = typeof target?.tagName === 'string' ? target.tagName.toUpperCase() : '';
    if (tagName !== 'LINK' && tagName !== 'SCRIPT') return false;
    const resourceUrl = tagName === 'LINK' ? target.href : target.src;
    if (!resourceUrl) return false;

    try {
      const resource = new URL(resourceUrl, window.location.href);
      return resource.origin === window.location.origin && resource.pathname.startsWith('/_next/static/');
    } catch {
      return false;
    }
  };

  const recover = () => {
    const pageUrl = new URL(window.location.href);
    const attemptsFromUrl = Number(pageUrl.searchParams.get(recoveryAttemptParam) || '0');
    let attempts = Number.isFinite(attemptsFromUrl) ? attemptsFromUrl : 0;

    try {
      const attemptsFromStorage = Number(window.sessionStorage.getItem(recoveryKey) || '0');
      if (Number.isFinite(attemptsFromStorage)) attempts = Math.max(attempts, attemptsFromStorage);
      window.sessionStorage.setItem(recoveryKey, String(attempts + 1));
    } catch {
      // The URL counter below keeps this bounded when private browsing blocks storage.
    }

    if (attempts >= maxRecoveryAttempts) return;

    const destination = pageUrl;
    destination.searchParams.set('__bbwv', ${serializedBuildToken});
    destination.searchParams.set(${serializedRecoveryParam}, '1');
    destination.searchParams.set('__bbwv_retry', String(Date.now()));
    destination.searchParams.set(recoveryAttemptParam, String(attempts + 1));
    window.location.replace(destination.toString());
  };

  window.addEventListener('error', (event) => {
    if (isBrokenNextStaticAsset(event.target)) recover();
  }, true);
})();`;
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
