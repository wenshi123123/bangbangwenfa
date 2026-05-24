"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    User,
    LogOut,
    Shield,
    Briefcase,
    Home,
    FileText,
    Scale,
    UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

export function Header() {
    const pathname = usePathname();

    const { user, isLoggedIn, isLoading, logout, checkAuth } = useAuth();

    useEffect(() => {
        const handleLoginSuccess = () => {
            checkAuth();
        };
        window.addEventListener("user-logged-in", handleLoginSuccess);
        return () =>
            window.removeEventListener("user-logged-in", handleLoginSuccess);
    }, [checkAuth]);

    const isHomePage = pathname === "/";
    const isCivilPage = pathname === "/civil";
    const isConsultPage = pathname === "/consult";
    const isGuardianPage = pathname?.startsWith("/guardian") || false;
    const isLawyerJoin = pathname === "/lawyer/join";
    const isLawyerLogin = pathname === "/lawyer/login";

    // 服务下拉是否高亮：当在民事/刑事页面时
    const isServiceActive = isCivilPage || isConsultPage;
    // 律师入口下拉是否高亮：当在律师入驻/登录页面时
    const isLawyerActive = isLawyerJoin || isLawyerLogin;

    const handleLoginClick = () => {
        if (typeof window !== "undefined") {
            sessionStorage.setItem("login_redirect", pathname || "/");
        }
        window.dispatchEvent(new CustomEvent("open-login-modal"));
    };

    // ---------- 主导航样式 ----------
    // 普通链接（无下拉）：active = orange，inactive = gray
    const mainLinkClass = (active: boolean) =>
        `inline-flex h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            active
                ? "text-orange-600 bg-orange-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`;

    // 下拉触发按钮样式（与 NavigationMenuTrigger 对齐）
    const dropdownTriggerClass = (active: boolean) =>
        `group inline-flex h-9 w-max items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            active
                ? "text-orange-600 bg-orange-50 data-[state=open]:bg-orange-50 data-[state=open]:text-orange-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 data-[state=open]:bg-gray-50 data-[state=open]:text-gray-900"
        } focus:outline-none disabled:pointer-events-none disabled:opacity-50`;

    // 下拉菜单项样式
    const dropdownLinkClass = (active: boolean) =>
        `flex items-start gap-3 rounded-md p-3 text-sm transition-colors ${
            active
                ? "bg-orange-50 text-orange-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`;

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
            <div className="container mx-auto px-3 sm:px-4">
                {/* 单行布局 */}
                <div className="flex items-center justify-between h-12 sm:h-14">
                    {/* 左侧：Logo + 导航 */}
                    <div className="flex items-center gap-1">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="flex items-center gap-2 shrink-0 mr-2 group"
                        >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden border-2 border-orange-200 shadow-sm group-hover:border-orange-300 transition-colors">
                                <img
                                    src="/logo-bangbang.png"
                                    alt="帮帮问法"
                                    className="w-full h-full object-contain p-0.5"
                                />
                            </div>
                            <span className="font-bold text-sm sm:text-base text-gray-900">
                                帮帮问法
                            </span>
                        </Link>

                        {/* 桌面端主导航 */}
                        <NavigationMenu className="hidden lg:flex">
                            <NavigationMenuList>
                                {/* 首页 */}
                                <NavigationMenuItem>
                                    <NavigationMenuLink
                                        asChild
                                        className={mainLinkClass(isHomePage)}
                                    >
                                        <Link href="/">
                                            <Home className="w-4 h-4 mr-1.5" />
                                            首页
                                        </Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>

                                {/* 服务下拉 */}
                                <NavigationMenuItem>
                                    <NavigationMenuTrigger
                                        className={dropdownTriggerClass(isServiceActive)}
                                    >
                                        <Scale className="w-4 h-4 mr-1.5" />
                                        服务
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <div className="w-[320px] p-2">
                                            {/* 民事服务 */}
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isCivilPage)}
                                            >
                                                <Link href="/civil">
                                                    <FileText className="w-5 h-5 mt-0.5 text-blue-500" />
                                                    <div>
                                                        <div className="font-medium">
                                                            民事服务
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                            离婚纠纷、合同纠纷、劳动仲裁…
                                                        </div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>

                                            {/* 分隔线 */}
                                            <div className="my-1 border-t border-gray-100" />

                                            {/* 刑事服务 */}
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isConsultPage)}
                                            >
                                                <Link href="/consult">
                                                    <Scale className="w-5 h-5 mt-0.5 text-orange-500" />
                                                    <div>
                                                        <div className="font-medium flex items-center gap-1.5">
                                                            刑事服务
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
                                                                热门
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                            取保候审、刑事辩护、刑事控告…
                                                        </div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>
                                        </div>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>

                                {/* 守护者计划 */}
                                <NavigationMenuItem>
                                    <NavigationMenuLink
                                        asChild
                                        className={mainLinkClass(isGuardianPage)}
                                    >
                                        <Link href="/guardian">
                                            <Shield className="w-4 h-4 mr-1.5" />
                                            守护者计划
                                        </Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>

                                {/* 律师入口下拉 */}
                                <NavigationMenuItem>
                                    <NavigationMenuTrigger
                                        className={dropdownTriggerClass(isLawyerActive)}
                                    >
                                        <Briefcase className="w-4 h-4 mr-1.5" />
                                        律师入口
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <div className="w-[280px] p-2">
                                            {/* 律师入驻 */}
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isLawyerJoin)}
                                            >
                                                <Link href="/lawyer/join">
                                                    <UserPlus className="w-5 h-5 mt-0.5 text-green-500" />
                                                    <div>
                                                        <div className="font-medium">
                                                            律师入驻
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                            申请成为平台律师，提供服务赚钱
                                                        </div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>

                                            {/* 分隔线 */}
                                            <div className="my-1 border-t border-gray-100" />

                                            {/* 律师登录 */}
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isLawyerLogin)}
                                            >
                                                <Link href="/lawyer/login">
                                                    <Briefcase className="w-5 h-5 mt-0.5 text-gray-500" />
                                                    <div>
                                                        <div className="font-medium">
                                                            律师登录
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                            已有账号？立即登录
                                                        </div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>
                                        </div>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    {/* 右侧：用户区 + 移动端菜单 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* 用户区域 */}
                        {isLoading ? (
                            <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse" />
                        ) : isLoggedIn ? (
                            <div className="flex items-center gap-1">
                                {user?.isLawyer && (
                                    <Link
                                        href="/lawyer"
                                        className="hidden lg:flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    >
                                        <Briefcase className="w-4 h-4" />
                                        <span>律师后台</span>
                                    </Link>
                                )}
                                {user?.isGuardian && (
                                    <Link
                                        href="/guardian/center"
                                        className="hidden lg:flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                        <Shield className="w-4 h-4" />
                                        <span>守护者</span>
                                    </Link>
                                )}
                                <Link
                                    href="/user"
                                    className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <User className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                        {user?.nickname || "个人中心"}
                                    </span>
                                </Link>
                                <button
                                    onClick={logout}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                    title="退出登录"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <Button
                                onClick={handleLoginClick}
                                size="sm"
                                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm hover:shadow-md hover:shadow-orange-500/20 transition-all duration-200 h-8 px-3"
                            >
                                <User className="w-4 h-4 mr-1" />
                                <span>登录</span>
                            </Button>
                        )}

                        {/* 移动端汉堡菜单 (lg以下显示) */}
                        <MobileNav />
                    </div>
                </div>
            </div>
        </header>
    );
}
