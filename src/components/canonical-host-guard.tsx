'use client';

import { useEffect } from 'react';
import { getCanonicalBrowserRedirectUrl } from '@/lib/site';

export function CanonicalHostGuard() {
  useEffect(() => {
    const redirectUrl = getCanonicalBrowserRedirectUrl(window.location.href);
    if (!redirectUrl) return;
    window.location.replace(redirectUrl);
  }, []);

  return null;
}
