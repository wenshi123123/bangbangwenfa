"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Menu,
    Home,
    FileText,
    Scale,
    Users,
    UserPlus,
    Briefcase,
    Shield,
    LogOut,
    User,
    Lightbulb,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { getCivilUrl } from "@/lib/site";

const USER_CENTER_HREF = "/me";

export function MobileNav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const { user, isLoggedIn, isLoading, logout } = useAuth();

    const handleLoginClick = () => {
        setOpen(false);
        if (typeof window !== "undefined") {
            sessionStorage.setItem("login_redirect", pathname || "/");
        }
        window.dispatchEvent(new CustomEvent("open-login-modal"));
    };

    const handleLogout = () => {
        setOpen(false);
        logout();
    };

    const linkClass = (active: boolean) =>
        `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
            active
                ? "text-[#C47353] bg-[#FAF7F2]"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`;

    const isHome = pathname === "/";
    const isCivil = pathname === "/civil";
    const isConsult = pathname === "/consult";
    const isGuardian = pathname?.startsWith("/guardian") || false;
    const isAbout = pathname === "/about";
    const isLawyerJoin = pathname === "/lawyer/join";
    const isLawyerLogin = pathname === "/lawyer/login";

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors lg:hidden"
                    aria-label="打开菜单"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] rounded-t-xl px-0">
                <SheetHeader className="border-b pb-3 px-4">
                    <SheetTitle className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg overflow-hidden border border-[rgba(196,115,83,0.2)]">
                            <img
                                src="/logo-bangbang.png"
                                alt="帮帮问法"
                                className="w-full h-full object-contain p-0.5"
                            />
                        </div>
                        <span className="font-serif text-[17px] tracking-[0.04em] text-[#3D322D]">帮帮问法</span>
                    </SheetTitle>
                </SheetHeader>

                {/* User area */}
                <div className="px-4 py-2 border-b">
                    {isLoading ? (
                        <div className="w-full h-10 bg-gray-100 rounded-lg animate-pulse" />
                    ) : isLoggedIn ? (
                        <div className="flex items-center justify-between">
                            <Link
                                href={USER_CENTER_HREF}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-700"
                            >
                                <User className="w-4 h-4" />
                                {user?.nickname || "个人中心"}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                title="退出登录"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <Button
                            onClick={handleLoginClick}
                            className="w-full bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full shadow-[0_2px_8px_rgba(196,115,83,0.3)]"
                        >
                            <User className="w-4 h-4 mr-1.5" />
                            登录 / 注册
                        </Button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-0.5 px-3 py-2 overflow-y-auto">
                    <Link
                        href="/"
                        onClick={() => setOpen(false)}
                        className={linkClass(isHome)}
                    >
                        <Home className="w-5 h-5" />
                        <span>首页</span>
                    </Link>

                    {/* 服务分组 */}
                    <div className="mt-2 mb-1 px-4">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            法律服务
                        </span>
                    </div>
                    <Link
                        href={getCivilUrl()}
                        onClick={() => setOpen(false)}
                        className={linkClass(isCivil)}
                    >
                        <FileText className="w-5 h-5" />
                        <div className="flex flex-col">
                            <span>民事服务</span>
                            <span className="text-xs text-gray-400">离婚纠纷、合同纠纷…</span>
                        </div>
                    </Link>
                    <Link
                        href="/consult"
                        onClick={() => setOpen(false)}
                        className={linkClass(isConsult)}
                    >
                        <Scale className="w-5 h-5" />
                        <div className="flex flex-col">
                            <span className="flex items-center gap-1.5">
                                刑事服务
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FAF7F2] text-[#C47353] font-medium">
                                    热门
                                </span>
                            </span>
                            <span className="text-xs text-gray-400">取保候审、刑事辩护…</span>
                        </div>
                    </Link>

                    <div className="mt-2 mb-1 px-4">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            更多服务
                        </span>
                    </div>
                    <Link
                        href="/about"
                        onClick={() => setOpen(false)}
                        className={linkClass(isAbout)}
                    >
                        <Lightbulb className="w-5 h-5" />
                        <div className="flex flex-col">
                            <span>关于帮帮</span>
                            <span className="text-xs text-gray-400">关于我们、联系方式</span>
                        </div>
                    </Link>
                    <Link
                        href="/guardian"
                        onClick={() => setOpen(false)}
                        className={linkClass(isGuardian)}
                    >
                        <Users className="w-5 h-5" />
                        <div className="flex flex-col">
                            <span className="flex items-center gap-1.5">
                                守护者计划
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FAF7F2] text-[#C47353] font-medium">
                                    返现激励
                                </span>
                            </span>
                            <span className="text-xs text-gray-400">用法律守护你心爱的人</span>
                        </div>
                    </Link>

                    <Link
                        href="/lawyer/join"
                        onClick={() => setOpen(false)}
                        className={linkClass(isLawyerJoin)}
                    >
                        <UserPlus className="w-5 h-5" />
                        <div className="flex flex-col">
                            <span>律师入驻</span>
                            <span className="text-xs text-gray-400">申请成为平台律师</span>
                        </div>
                    </Link>
                    <Link
                        href="/lawyer/login"
                        onClick={() => setOpen(false)}
                        className={linkClass(isLawyerLogin)}
                    >
                        <Briefcase className="w-5 h-5" />
                        <div className="flex flex-col">
                            <span>律师登录</span>
                            <span className="text-xs text-gray-400">已有账号？立即登录</span>
                        </div>
                    </Link>

                    {/* 已登录用户快捷入口 */}
                    {isLoggedIn && (
                        <>
                            {user?.isLawyer && (
                                <>
                                    <div className="mt-2 mb-1 px-4">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            快捷入口
                                        </span>
                                    </div>
                                    <Link
                                        href="/lawyer"
                                        onClick={() => setOpen(false)}
                                        className={linkClass(pathname?.startsWith("/lawyer") || false)}
                                    >
                                        <Briefcase className="w-5 h-5" />
                                        <span>律师后台</span>
                                    </Link>
                                </>
                            )}
                            {user?.isGuardian && (
                                <Link
                                    href="/guardian/center"
                                    onClick={() => setOpen(false)}
                                    className={linkClass(pathname?.startsWith("/guardian/center") || false)}
                                >
                                    <Shield className="w-5 h-5" />
                                    <span>守护者中心</span>
                                </Link>
                            )}
                        </>
                    )}
                </nav>
            </SheetContent>
        </Sheet>
    );
}
