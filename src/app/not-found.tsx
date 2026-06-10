import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
      <div className="text-center px-6 max-w-sm">
        {/* 404 装饰 */}
        <div className="relative mb-8">
          <div className="font-serif text-[120px] leading-none text-[#C47353] opacity-10 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-[#F5EDE5] flex items-center justify-center">
              <svg className="w-10 h-10 text-[#C47353]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="font-serif text-[28px] text-[#3D322D] font-normal mb-3">
          页面未找到
        </h1>
        <p className="font-sans text-[14px] text-[#8C7B6E] leading-[1.8] mb-8">
          您访问的页面不存在或已被移除。<br />
          请检查网址是否正确，或返回首页。
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#C47353] hover:bg-[#A85D40] text-white font-sans text-[14px] font-medium rounded-full px-8 py-[12px] tracking-[0.02em] shadow-[0_2px_8px_rgba(196,115,83,0.3)] hover:-translate-y-[1px] active:scale-[0.98] transition-all duration-200"
        >
          返回首页
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
