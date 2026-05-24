'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, User } from 'lucide-react';

const tabs = [
  {
    key: 'dashboard',
    label: '工作台',
    icon: LayoutDashboard,
    path: '/lawyer',
  },
  {
    key: 'orders',
    label: '订单',
    icon: FileText,
    path: '/lawyer/orders',
  },
  {
    key: 'profile',
    label: '我的',
    icon: User,
    path: '/lawyer/profile',
  },
];

export function LawyerBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (tabPath: string) => {
    if (tabPath === '/lawyer') {
      return pathname === '/lawyer' || pathname === '/lawyer/dashboard';
    }
    return pathname.startsWith(tabPath);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(139,123,110,0.1)',
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.path)}
              className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[64px] transition-all duration-200 active:scale-95"
            >
              {/* 激活指示器 — 顶部小圆点 */}
              {active && (
                <span className="absolute -top-0.5 w-5 h-0.5 rounded-full bg-[#C47353]" />
              )}
              <Icon
                className={`w-5 h-5 mb-0.5 transition-all duration-200 ${
                  active
                    ? 'text-[#C47353]'
                    : 'text-[#8C7B6E] hover:text-[#A0897A]'
                }`}
                strokeWidth={active ? 2.5 : 1.75}
                fill={active ? 'rgba(196,115,83,0.12)' : 'none'}
              />
              <span
                className={`text-[10px] leading-none transition-all duration-200 ${
                  active
                    ? 'text-[#C47353] font-semibold'
                    : 'text-[#8C7B6E] font-normal'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

      </div>
    </div>
  );
}
