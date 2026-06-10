'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#FEF3E2' }}>
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">系统错误</h2>
            <p className="text-gray-500 mb-4 text-sm">
              系统遇到了一个严重错误。请将下方红色信息截图发送给开发者。
            </p>
            {/* 🔍 DEBUG: 显示具体错误信息 */}
            <div className="text-left mb-4 p-3 bg-red-50 rounded-lg border border-red-200 max-h-48 overflow-auto">
              <p className="text-red-700 text-xs font-mono font-bold mb-1">{error.message}</p>
              {error.stack && (
                <pre className="text-red-500 text-[10px] font-mono whitespace-pre-wrap leading-relaxed">{error.stack}</pre>
              )}
            </div>
            <button
              onClick={reset}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all"
            >
              刷新页面
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
