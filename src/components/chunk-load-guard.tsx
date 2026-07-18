'use client';

import { useEffect } from 'react';
import { BUILD_CACHE_BUST_VALUE } from '@/lib/build-meta';
import {
  buildStaticAssetRecoveryUrl,
  buildStaticAssetRecoveryFailureMarkup,
  claimStaticAssetRecoveryFromSession,
} from '@/lib/static-asset-recovery';

function isChunkLoadError(reason: unknown) {
  const text =
    reason instanceof Error
      ? `${reason.name}: ${reason.message}`
      : String(reason ?? '');

  return /ChunkLoadError|Loading chunk \d+ failed/i.test(text);
}

export function ChunkLoadGuard() {
  useEffect(() => {
    const reloadOnce = () => {
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

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      reloadOnce();
    };

    const onError = (event: ErrorEvent) => {
      if (
        isChunkLoadError(event.error) ||
        /Loading chunk \d+ failed/i.test(event.message)
      ) {
        reloadOnce();
      }
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onError);

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  return null;
}
