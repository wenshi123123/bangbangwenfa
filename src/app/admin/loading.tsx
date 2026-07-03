'use client';

import Link from 'next/link';
import { Scale } from 'lucide-react';
import { getAdminLoginUrl } from '@/lib/site';

export default function AdminLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
          <Scale className="w-7 h-7 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">管理员登录</h1>
        <p className="mt-2 text-sm text-slate-500">正在进入后台，请先登录管理员账号后再继续访问</p>
        <div className="mt-6">
          <Link
            href={getAdminLoginUrl()}
            className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            前往登录
          </Link>
        </div>
      </div>
    </div>
  );
}
