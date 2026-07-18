'use client';

import { useEffect } from 'react';

/**
 * Browsers can restore an already-open page from the back/forward cache
 * without requesting the current HTML again. Refresh only that restored
 * document so users do not keep seeing a pre-deployment page.
 */
export function BfcacheRefreshGuard() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return null;
}
