import Link from 'next/link';

export default function UserLoading() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_4px_16px_rgba(61,50,45,0.08)] text-center">
        <h2 className="text-xl font-serif text-[#3D322D] font-normal mb-4">请先登录</h2>
        <p className="text-[#8C7B6E] mb-4">登录后可查看您的个人中心</p>
        <Link
          href="/register?next=/user"
          className="inline-flex items-center justify-center rounded-full bg-[#C47353] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#A85D40]"
        >
          手机号登录
        </Link>
      </div>
    </div>
  );
}
