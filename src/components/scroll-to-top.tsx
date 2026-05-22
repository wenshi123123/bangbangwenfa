'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollToTop() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    
    // 延迟150ms + requestAnimationFrame 双保险，确保新页面内容加载完成
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ 
          top: 0, 
          left: 0, 
          behavior: 'instant' 
        });
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
