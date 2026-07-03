'use client';

import { useEffect } from 'react';

const RELOAD_KEY = '__bbwv_chunk_reload_once';

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
      if (sessionStorage.getItem(RELOAD_KEY) === '1') return;
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
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
