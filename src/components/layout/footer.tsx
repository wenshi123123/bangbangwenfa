"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

const ADMIN_LOGIN_HREF = "/admin/login?v=20260629a";

const footerLinks = {
  服务: [
    { label: "民事咨询", href: "/civil" },
    { label: "刑事咨询", href: "/consult" },
    { label: "守护者计划", href: "/guardian" },
  ],
  律师: [
    { label: "律师入驻", href: "/lawyer/join" },
    { label: "律师登录", href: "/lawyer/login" },
    { label: "入驻承诺书", href: "/lawyer-commitment" },
  ],
  法律信息: [
    { label: "用户服务协议", href: "/user-agreement" },
    { label: "隐私政策", href: "/privacy-policy" },
    { label: "律师入驻服务协议", href: "/lawyer-entry-agreement" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#FAF7F2] border-t border-[rgba(196,115,83,0.15)]">
      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* 第1列：微信二维码 */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex flex-col items-center sm:items-start">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl overflow-hidden border border-[rgba(196,115,83,0.2)] shadow-[0_4px_16px_rgba(61,50,45,0.08)]">
                <Image
                  src="/wechat-qr.jpg"
                  alt="扫码关注帮帮问法"
                  width={144}
                  height={144}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <h3 className="mt-4 text-sm sm:text-base font-serif text-[#3D322D] font-normal">
                扫码关注帮帮问法
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[#8C7B6E] leading-relaxed max-w-[240px] text-center sm:text-left">
                获取更多法律资讯和即时咨询服务，专业律师团队在线为您解答
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-[#B4A99A]">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  工作日 9:00-18:00
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#B4A99A]">
                  <span className="w-1.5 h-1.5 bg-[#C47353] rounded-full animate-pulse" />
                  专业律师在线
                </span>
              </div>
            </div>
          </div>

          {/* 第2-4列：导航链接 */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-[#3D322D] mb-3 sm:mb-4">
                {category}
              </h4>
              <ul className="space-y-2 sm:space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs sm:text-sm text-[#8C7B6E] hover:text-[#C47353] transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 底部栏 */}
      <div className="border-t border-[rgba(196,115,83,0.15)]">
        <div className="container mx-auto px-4 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 max-w-6xl mx-auto">
            <p className="text-xs text-[#B4A99A]">
              © 2024{' '}
              <Link
                href={ADMIN_LOGIN_HREF}
                className="text-[#B4A99A] hover:text-[#C47353] transition-colors duration-200"
              >
                帮帮问法
              </Link>{' '}
              版权所有
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
