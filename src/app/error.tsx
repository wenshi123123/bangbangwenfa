'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(61,50,45,0.08)] p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#C47353]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-serif text-[#3D322D] font-normal mb-2">页面加载出错</h2>
        <div className="text-left mb-4 p-3 bg-red-50 rounded-lg border border-red-200 max-h-48 overflow-auto">
          <p className="text-red-700 text-xs font-mono font-bold mb-1">{error.message}</p>
          {error.stack && (
            <pre className="text-red-500 text-[10px] font-mono whitespace-pre-wrap leading-relaxed">{error.stack}</pre>
          )}
        </div>
        <p className="text-[#8C7B6E] mb-6 text-sm">
          请将上方红色错误信息截图发送给开发者排查。
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full font-medium transition-all duration-250 shadow-[0_2px_8px_rgba(196,115,83,0.3)] hover:-translate-y-[1px]"
        >
          刷新页面
        </button>
      </div>
    </div>
  );
}
