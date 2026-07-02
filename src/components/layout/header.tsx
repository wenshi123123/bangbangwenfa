"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    User,
    LogOut,
    Shield,
    Briefcase,
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

const USER_CENTER_HREF = "/me";

export function Header() {
    const pathname = usePathname();
    const [showDesktopNav, setShowDesktopNav] = useState(false);

    const { user, isLoggedIn, isLoading, logout, checkAuth } = useAuth();

    // 未读通知数
    const [unreadCount, setUnreadCount] = useState(0);

    // 获取未读通知数
    useEffect(() => {
        if (!isLoggedIn) {
            setUnreadCount(0);
            return;
        }
        const loadUnread = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/user/notifications?unreadOnly=true&limit=1', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                const result = await res.json();
                if (result.success) {
                    setUnreadCount(result.unreadCount || 0);
                }
            } catch (e) { /* ignore */ }
        };
        loadUnread();
        const interval = setInterval(loadUnread, 30000);
        return () => clearInterval(interval);
    }, [isLoggedIn]);

    useEffect(() => {
        const handleLoginSuccess = () => {
            checkAuth();
        };
        window.addEventListener("user-logged-in", handleLoginSuccess);
        return () =>
            window.removeEventListener("user-logged-in", handleLoginSuccess);
    }, [checkAuth]);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 1024px)');
        const update = () => setShowDesktopNav(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    const isHomePage = pathname === "/";
    const isAboutPage = pathname === "/about";
    const isCivilPage = pathname === "/civil";
    const isConsultPage = pathname === "/consult";
    const isGuardianPage = pathname?.startsWith("/guardian") || false;
    const isGuardianCenter = pathname === "/guardian/center";
    const isLawyerJoin = pathname === "/lawyer/join";
    const isLawyerLogin = pathname === "/lawyer/login";

    // 法律服务下拉：当在民事/刑事页面时
    const isServiceActive = isCivilPage || isConsultPage;
    // 守护者下拉：当在守护者计划或守护者中心时
    const isGuardianActive = isGuardianPage || isGuardianCenter;
    // 律师入驻下拉：当在律师入驻/登录页面时
    const isLawyerActive = isLawyerJoin || isLawyerLogin;

    const handleLoginClick = () => {
        if (typeof window !== "undefined") {
            sessionStorage.setItem("login_redirect", pathname || "/");
        }
        window.dispatchEvent(new CustomEvent("open-login-modal"));
    };

    // ---------- 杂志风格导航基类 ----------
    const navItemBase = "inline-flex h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-medium font-serif tracking-wide transition-colors";
    const navItemUnderline = "relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-px after:rounded-full after:bg-[#C47353] after:transition-all after:duration-200";
    const navActiveClass = "text-[#C47353] after:w-full after:opacity-100";
    const navInactiveClass = "text-[#8C7B6E] hover:text-[#3D322D] after:w-0 after:opacity-0";

    // 普通链接（无下拉）
    const mainLinkClass = (active: boolean) =>
        `nav-link ${navItemBase} ${navItemUnderline} ${
            active ? navActiveClass : navInactiveClass
        }`;

    // 下拉触发按钮（需覆盖 shadcn CVA 默认样式 + 浏览器 button 默认样式）
    const dropdownTriggerClass = (active: boolean) =>
        `nav-link group ${navItemBase} ${navItemUnderline} !px-3 !font-serif !text-sm !font-medium !tracking-wide !leading-normal bg-transparent hover:bg-transparent focus:bg-transparent focus-visible:ring-0 data-[state=open]:bg-transparent ${
            active
                ? `${navActiveClass} data-[state=open]:text-[#C47353] data-[state=open]:after:w-1/2 data-[state=open]:after:opacity-100`
                : `${navInactiveClass} data-[state=open]:text-[#3D322D]`
        } focus:outline-none disabled:pointer-events-none disabled:opacity-50`;

    // 下拉菜单项样式
    const dropdownLinkClass = (active: boolean) =>
        `flex items-start gap-3 rounded-md p-3 text-sm transition-colors font-serif ${
            active
                ? "bg-[#FAF7F2] text-[#C47353]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`;

    return (
        <header className="sticky top-0 z-50 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)] nav-inner">
            <div className="container mx-auto px-3 sm:px-4">
                <div className="flex items-center justify-between h-12 sm:h-14">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 shrink-0 group nav-logo"
                    >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden border border-[rgba(196,115,83,0.2)] group-hover:border-[#C47353] transition-colors">
                            <img
                                src="/logo-bangbang.png"
                                alt="帮帮问法"
                                className="w-full h-full object-contain p-0.5"
                            />
                        </div>
                        <span className="font-serif text-[17px] tracking-[0.04em] text-[#3D322D]">
                            帮帮问法
                        </span>
                    </Link>

                    {/* 桌面端主导航 - 仅在桌面端挂载，避免移动端出现隐藏按钮影响首个可见控件判断 */}
                    {showDesktopNav ? (
                    <div className="hidden lg:flex flex-1 items-center justify-between mx-8">
                        {/* 首页 */}
                        <Link
                            href="/"
                            className={mainLinkClass(isHomePage)}
                        >
                            首页
                        </Link>

                        {/* 法律服务下拉 */}
                        <NavigationMenu delayDuration={999999}>
                            <NavigationMenuList>
                                <NavigationMenuItem>
                                    <NavigationMenuTrigger
                                        className={dropdownTriggerClass(isServiceActive)}
                                    >
                                        法律服务
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <div className="w-[320px] p-2">
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isCivilPage)}
                                            >
                                                <Link href="/civil">
                                                    <FileText className="w-5 h-5 mt-0.5 text-[#C47353]" />
                                                    <div>
                                                        <div className="font-medium">民事服务</div>
                                                        <div className="text-xs text-gray-400 mt-0.5">离婚纠纷、合同纠纷、劳动仲裁…</div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>
                                            <div className="my-1 border-t border-gray-100" />
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isConsultPage)}
                                            >
                                                <Link href="/consult">
                                                    <Scale className="w-5 h-5 mt-0.5 text-[#C47353]" />
                                                    <div>
                                                        <div className="font-medium flex items-center gap-1.5">
                                                            刑事服务
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F5EDE5] text-[#C47353] font-medium">热门</span>
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5">取保候审、刑事辩护、刑事控告…</div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>
                                        </div>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>

                        {/* 关于帮帮 */}
                        <Link
                            href="/about"
                            className={mainLinkClass(isAboutPage)}
                        >
                            关于帮帮
                        </Link>

                        {/* 守护者下拉 */}
                        <NavigationMenu delayDuration={999999}>
                            <NavigationMenuList>
                                <NavigationMenuItem>
                                    <NavigationMenuTrigger
                                        className={dropdownTriggerClass(isGuardianActive)}
                                    >
                                        守护者
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <div className="w-[280px] p-2">
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isGuardianPage && !isGuardianCenter)}
                                            >
                                                <Link href="/guardian">
                                                    <Shield className="w-5 h-5 mt-0.5 text-[#C47353]" />
                                                    <div>
                                                        <div className="font-medium">守护者计划</div>
                                                        <div className="text-xs text-gray-400 mt-0.5">了解并加入守护者计划</div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>
                                            <div className="my-1 border-t border-gray-100" />
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isGuardianCenter)}
                                            >
                                                <Link href="/guardian/center">
                                                    <User className="w-5 h-5 mt-0.5 text-[#8C7B6E]" />
                                                    <div>
                                                        <div className="font-medium">守护者中心</div>
                                                        <div className="text-xs text-gray-400 mt-0.5">查看守护者数据和收益</div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>
                                        </div>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>

                        {/* 律师入驻下拉 */}
                        <NavigationMenu delayDuration={999999}>
                            <NavigationMenuList>
                                <NavigationMenuItem>
                                    <NavigationMenuTrigger
                                        className={dropdownTriggerClass(isLawyerActive)}
                                    >
                                        律师入驻
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <div className="w-[280px] p-2">
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isLawyerJoin)}
                                            >
                                                <Link href="/lawyer/join">
                                                    <UserPlus className="w-5 h-5 mt-0.5 text-[#8C7B6E]" />
                                                    <div>
                                                        <div className="font-medium">律师入驻</div>
                                                        <div className="text-xs text-gray-400 mt-0.5">申请成为平台律师，提供服务赚钱</div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>
                                            <div className="my-1 border-t border-gray-100" />
                                            <NavigationMenuLink
                                                asChild
                                                className={dropdownLinkClass(isLawyerLogin)}
                                            >
                                                <Link href="/lawyer/login">
                                                    <Briefcase className="w-5 h-5 mt-0.5 text-[#8C7B6E]" />
                                                    <div>
                                                        <div className="font-medium">律师登录</div>
                                                        <div className="text-xs text-gray-400 mt-0.5">已有账号？立即登录</div>
                                                    </div>
                                                </Link>
                                            </NavigationMenuLink>
                                        </div>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>
                    ) : (
                        <div className="flex-1" />
                    )}

                    {/* 右侧：用户区 + 移动端菜单 */}
                    <div className="flex items-center gap-1.5 shrink-0 nav-actions">
                        {/* 用户区域 */}
                        {isLoading ? (
                            <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse" />
                        ) : isLoggedIn ? (
                            <div className="flex items-center gap-1">
                                {user?.isLawyer && (
                                    <Link
                                        href="/lawyer"
                                        className="hidden lg:flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-[#C47353] hover:bg-[#FAF7F2] rounded-lg transition-colors font-serif"
                                    >
                                        <Briefcase className="w-4 h-4" />
                                        <span>律师后台</span>
                                    </Link>
                                )}
                                {user?.isGuardian && (
                                    <Link
                                        href="/guardian/center"
                                        className="hidden lg:flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-[#8C7B6E] hover:bg-[#FAF7F2] rounded-lg transition-colors font-serif"
                                    >
                                        <Shield className="w-4 h-4" />
                                        <span>守护者</span>
                                    </Link>
                                )}
                                <Link
                                    href={USER_CENTER_HREF}
                                    className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-serif"
                                >
                                    <div className="relative">
                                        <User className="w-4 h-4" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
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
                            <div className="flex items-center gap-1.5">
                                <Link
                                    href="/register"
                                    className="hidden lg:inline-flex items-center px-3 py-1.5 text-sm font-medium font-serif text-[#C47353] hover:bg-[#FAF7F2] rounded-full transition-colors"
                                >
                                    注册
                                </Link>
                                <Button
                                    onClick={handleLoginClick}
                                    size="sm"
                                    className="bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full shadow-[0_2px_8px_rgba(196,115,83,0.3)] transition-all duration-200 min-h-[38px] h-9 sm:h-8 px-4 hover:-translate-y-[1px] active:scale-[0.98] font-serif tracking-wide"
                                >
                                    <User className="w-4 h-4 mr-1" />
                                    <span>登录</span>
                                </Button>
                            </div>
                        )}

                        {/* 移动端汉堡菜单 (lg以下显示) */}
                        <MobileNav />
                    </div>
                </div>
            </div>
        </header>
    );
}
