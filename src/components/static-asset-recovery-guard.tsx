'use client';

import { useEffect } from 'react';
import { BUILD_CACHE_BUST_VALUE } from '@/lib/build-meta';
import {
  buildStaticAssetRecoveryUrl,
  buildStaticAssetRecoveryFailureMarkup,
  claimStaticAssetRecoveryFromSession,
  getStaticResourceUrl,
  isSameOriginNextStaticAsset,
  type ResourceElementLike,
} from '@/lib/static-asset-recovery';

export function StaticAssetRecoveryGuard() {
  useEffect(() => {
    const onResourceError = (event: Event) => {
      const resourceUrl = getStaticResourceUrl(event.target as ResourceElementLike);

      if (!resourceUrl || !isSameOriginNextStaticAsset(resourceUrl, window.location.origin)) {
        return;
      }

      if (!claimStaticAssetRecoveryFromSession()) {
        if (document.body) {
          document.body.innerHTML = buildStaticAssetRecoveryFailureMarkup(BUILD_CACHE_BUST_VALUE);
        }
        return;
      }

      window.location.replace(
        buildStaticAssetRecoveryUrl(window.location.href, BUILD_CACHE_BUST_VALUE),
      );
    };

    window.addEventListener('error', onResourceError, true);
    return () => window.removeEventListener('error', onResourceError, true);
  }, []);

  return null;
}
