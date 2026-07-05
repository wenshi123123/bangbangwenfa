"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Search, Scale, FileText, Shield, Info, ArrowRight } from "lucide-react";
import { getAboutUrl, getCivilUrl, getConsultUrl, getGuardianUrl, getLawyerJoinUrl } from "@/lib/site";

// 快捷搜索建议
const quickLinks = [
  { href: getCivilUrl(), label: "民事服务", desc: "离婚纠纷、合同纠纷、劳动仲裁", icon: FileText },
  { href: getConsultUrl(), label: "刑事服务", desc: "取保候审、刑事辩护、刑事控告", icon: Scale },
  { href: getGuardianUrl(), label: "守护者计划", desc: "了解并加入守护者计划", icon: Shield },
  { href: getAboutUrl(), label: "关于帮帮", desc: "了解帮帮问法平台", icon: Info },
  { href: getLawyerJoinUrl(), label: "律师入驻", desc: "申请成为平台律师", icon: Scale },
];

// 热门搜索词
const hotSearches = [
  "离婚纠纷", "合同纠纷", "劳动仲裁", "刑事辩护", "欠款追讨",
  "交通事故", "房产纠纷", "遗产继承", "取保候审", "民间借贷",
];

export default function SearchModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onClose = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-search", handleOpen);
    return () => window.removeEventListener("open-search", handleOpen);
  }, []);

  // 打开时自动聚焦输入框
  useEffect(() => {
    if (isOpen) {
      // 延迟一点让动画先开始
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      // 映射常见搜索词到对应页面
      const civilKeywords = ["离婚", "合同", "劳动仲裁", "欠款", "交通", "房产", "遗产", "借贷"];
      const consultKeywords = ["刑事", "辩护", "取保", "控告", "逮捕", "诈骗", "盗窃"];
      const civilUrl = getCivilUrl();

      if (civilKeywords.some((kw) => trimmed.includes(kw))) {
        router.push(civilUrl);
      } else if (consultKeywords.some((kw) => trimmed.includes(kw))) {
        router.push(getConsultUrl());
      } else {
        // 默认跳转到民事服务页
        router.push(civilUrl);
      }

      onClose();
    },
    [query, router, onClose],
  );

  const handleQuickNav = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-[#3D322D]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl shadow-[0_10px_50px_rgba(61,50,45,0.2)] overflow-hidden">
          {/* 顶部装饰条 */}
          <div className="h-1 bg-[#C47353]" />

          {/* 搜索输入区 */}
          <div className="p-6 pb-4">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8C7B6E]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索法律服务…"
                  className="w-full h-14 pl-12 pr-12 bg-[#FAF7F2] rounded-xl border border-[rgba(196,115,83,0.15)] text-[#3D322D] text-base font-serif placeholder:text-[#8C7B6E]/60 focus:outline-none focus:border-[#C47353] focus:ring-1 focus:ring-[#C47353]/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C7B6E] hover:text-[#3D322D] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 pl-2">
                <span className="text-[11px] text-[#8C7B6E] font-medium">按 Enter 搜索</span>
                <span className="text-[11px] text-[#8C7B6E]">·</span>
                <span className="text-[11px] text-[#8C7B6E] font-medium">按 ESC 关闭</span>
              </div>
            </form>
          </div>

          {/* 分隔线 */}
          <div className="mx-6 border-t border-[rgba(196,115,83,0.1)]" />

          {/* 快捷入口 */}
          <div className="p-6 pt-4">
            <p className="text-xs font-medium text-[#8C7B6E] tracking-wide mb-3 font-serif">
              快捷入口
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.href}
                    onClick={() => handleQuickNav(link.href)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF7F2] hover:bg-[#F5EDE5] border border-[rgba(196,115,83,0.08)] transition-all duration-200 group text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-[rgba(196,115,83,0.12)] flex items-center justify-center shrink-0 group-hover:border-[#C47353]/30 transition-colors">
                      <Icon className="w-4 h-4 text-[#C47353]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#3D322D] font-serif">{link.label}</p>
                      <p className="text-[10px] text-[#8C7B6E] truncate">{link.desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C47353]/40 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 热门搜索 */}
          <div className="px-6 pb-6">
            <p className="text-xs font-medium text-[#8C7B6E] tracking-wide mb-3 font-serif">
              热门搜索
            </p>
            <div className="flex flex-wrap gap-2">
              {hotSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setQuery(term);
                    // 自动提交
                    const civilKeywords = ["离婚", "合同", "劳动仲裁", "欠款", "交通", "房产", "遗产", "借贷"];
                    const consultKeywords = ["刑事", "辩护", "取保", "控告", "逮捕", "诈骗", "盗窃"];
                    const civilUrl = getCivilUrl();
                    if (civilKeywords.some((kw) => term.includes(kw))) {
                      router.push(civilUrl);
                    } else if (consultKeywords.some((kw) => term.includes(kw))) {
        router.push(getConsultUrl());
                    } else {
                      router.push(civilUrl);
                    }
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-[#8C7B6E] bg-[#FAF7F2] rounded-full border border-[rgba(196,115,83,0.08)] hover:bg-[#F5EDE5] hover:text-[#C47353] hover:border-[#C47353]/20 transition-all duration-200 font-serif"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
