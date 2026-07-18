import { STATIC_ASSET_RECOVERY_PARAM } from '@/lib/build-meta';

export { STATIC_ASSET_RECOVERY_PARAM };

export const STATIC_ASSET_RECOVERY_KEY = '__bbwv_static_asset_recovery_once';
const INTERNAL_RECOVERY_PARAMS = [
  '__bbwv',
  STATIC_ASSET_RECOVERY_PARAM,
  '__bbwv_retry',
  '__bbwv_attempt',
] as const;

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

export function cleanStaticAssetRecoveryParams(url: URL) {
  let changed = false;

  for (const param of INTERNAL_RECOVERY_PARAMS) {
    if (!url.searchParams.has(param)) continue;
    url.searchParams.delete(param);
    changed = true;
  }

  return changed;
}

export function buildStaticAssetRecoveryFailureMarkup() {
  return `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#faf7f2;color:#3d322d;font-family:Arial,'Microsoft YaHei',sans-serif;text-align:center">
      <section style="max-width:360px">
        <h1 style="font-size:24px;margin:0 0 12px">页面暂时没有加载完整</h1>
        <p style="font-size:15px;line-height:1.7;margin:0 0 20px;color:#6f625b">请点击下面按钮重新打开，通常即可恢复正常。</p>
        <button type="button" onclick="window.location.reload()" style="min-height:44px;padding:10px 24px;border:1px solid #c47353;border-radius:24px;background:#c47353;color:#fff;font-size:16px">重新打开</button>
      </section>
    </main>`;
}

/**
 * Runs before the Next.js runtime. This catches a missing stylesheet or script
 * even when the React recovery guards cannot be downloaded themselves.
 */
export function buildInlineStaticAssetRecoveryScript(buildToken: string) {
  const serializedBuildToken = JSON.stringify(buildToken);
  const serializedRecoveryParam = JSON.stringify(STATIC_ASSET_RECOVERY_PARAM);

  return `(() => {
  const cleanUrl = new URL(window.location.href);
  const internalParams = ['__bbwv', ${serializedRecoveryParam}, '__bbwv_retry', '__bbwv_attempt'];
  let hadInternalParams = false;
  internalParams.forEach((param) => {
    if (!cleanUrl.searchParams.has(param)) return;
    cleanUrl.searchParams.delete(param);
    hadInternalParams = true;
  });
  if (hadInternalParams && window.history && typeof window.history.replaceState === 'function') {
    window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  }

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

    if (attempts >= maxRecoveryAttempts) {
      if (document && document.body) {
        document.body.innerHTML = ${JSON.stringify(buildStaticAssetRecoveryFailureMarkup())};
      }
      return;
    }

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
