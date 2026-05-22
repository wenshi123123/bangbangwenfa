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
    Lightbulb,
    Users,
    UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
    const pathname = usePathname();

    const {
        user,
        isLoggedIn,
        isLoading,
        logout,
        checkAuth
    } = useAuth();

    useEffect(() => {
        const handleLoginSuccess = () => {
            checkAuth();
        };

        window.addEventListener("user-logged-in", handleLoginSuccess);
        return () => window.removeEventListener("user-logged-in", handleLoginSuccess);
    }, [checkAuth]);

    const isHomePage = pathname === "/";
    const isConsultPage = pathname === "/consult";

    const handleLoginClick = () => {
        if (typeof window !== "undefined") {
            sessionStorage.setItem("login_redirect", pathname || "/");
        }

        window.dispatchEvent(new CustomEvent("open-login-modal"));
    };

    const navItems = [{
        href: "/",
        label: "首页",
        icon: Home,
        active: isHomePage,
        group: "base"
    }, {
        href: "/civil",
        label: "民事服务",
        icon: FileText,
        active: pathname === "/civil",
        group: "core",
        color: "blue"
    }, {
        href: "/consult",
        label: "刑事服务",
        icon: Scale,
        active: isConsultPage,
        group: "core",
        color: "orange",
        primary: true
    }, {
        href: "/about",
        label: "了解帮帮",
        icon: Lightbulb,
        active: pathname === "/about",
        group: "other",
        color: "amber"
    }, {
        href: "/guardian",
        label: "守护者计划",
        icon: Users,
        active: pathname?.startsWith("/guardian") || false,
        group: "other",
        color: "rose"
    }, {
        href: "/lawyer/join",
        label: "律师入驻",
        icon: UserPlus,
        active: pathname === "/lawyer/join",
        group: "lawyer",
        color: "green"
    }, {
        href: "/lawyer/login",
        label: "律师登录",
        icon: Briefcase,
        active: pathname === "/lawyer/login",
        group: "lawyer",
        color: "green"
    }];

    const colorMap: Record<string, {
        bg: string;
        text: string;
    }> = {
        blue: {
            bg: "bg-blue-50",
            text: "text-blue-600"
        },

        orange: {
            bg: "bg-orange-50",
            text: "text-orange-600"
        },

        amber: {
            bg: "bg-amber-50",
            text: "text-amber-600"
        },

        rose: {
            bg: "bg-rose-50",
            text: "text-rose-600"
        },

        green: {
            bg: "bg-green-50",
            text: "text-green-600"
        }
    };

    const getNavLinkClass = (item: typeof navItems[0]) => {
        const baseClass = "relative flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium transition-all duration-200 rounded-lg whitespace-nowrap group";

        if (item.active) {
            const colors = item.color ? colorMap[item.color] : null;

            if (colors) {
                return `${baseClass} ${colors.text} ${colors.bg}`;
            }

            return `${baseClass} text-orange-600 bg-orange-50`;
        }

        return `${baseClass} text-gray-600 hover:text-gray-900 hover:bg-gray-50`;
    };

    const renderNavItem = (item: typeof navItems[0]) => {
        const Icon = item.icon;
        const className = getNavLinkClass(item);

        return (
            <Link key={item.href} href={item.href} className={className}>
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {}
                {!item.active && <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 rounded-full transition-all duration-300 group-hover:w-4 group-hover:bg-current opacity-0 group-hover:opacity-100" />}
            </Link>
        );
    };

    const Divider = () => <div className="w-px h-5 bg-gray-200 mx-0.5 hidden sm:block" />;

    return (
        <header
            className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
            <div className="container mx-auto px-3 sm:px-4">
                {}
                <div className="flex items-center justify-between h-12 sm:h-14">
                    {}
                    <Link href="/" className="flex items-center gap-2 shrink-0 group">
                        <div
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden border-2 border-orange-200 shadow-sm group-hover:border-orange-300 transition-colors">
                            <img
                                src="/logo-bangbang.png"
                                alt="帮帮问法"
                                className="w-full h-full object-contain p-0.5" />
                        </div>
                        <span className="font-bold text-sm sm:text-base text-gray-900">帮帮问法</span>
                    </Link>
                    {}
                    <div
                        className="flex items-center gap-2 shrink-0"
                        style={{
                            margin: "32px"
                        }}>
                        {isLoading ? <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse" /> : isLoggedIn ? <div className="flex items-center gap-1">
                            {user?.isLawyer && <Link
                                href="/lawyer"
                                className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <Briefcase className="w-4 h-4" />
                                <span className="hidden md:inline">律师后台</span>
                            </Link>}
                            {user?.isGuardian && <Link
                                href="/guardian/center"
                                className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                <Shield className="w-4 h-4" />
                                <span className="hidden md:inline">守护者</span>
                            </Link>}
                            <Link
                                href="/user"
                                className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                                <User className="w-4 h-4" />
                                <span className="hidden sm:inline">{user?.nickname || "个人中心"}</span>
                            </Link>
                            <button
                                onClick={logout}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                title="退出登录">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div> : <Button
                            onClick={handleLoginClick}
                            size="sm"
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm hover:shadow-md hover:shadow-orange-500/20 transition-all duration-200 h-8 px-3"
                            style={{
                                margin: "1px"
                            }}>
                            <User className="w-4 h-4 mr-1" />
                            <span>登录</span>
                        </Button>}
                    </div>
                </div>
                {}
                <nav
                    className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-1 sm:gap-0.5 pb-2 sm:pb-3">
                    {}
                    <div className="w-full sm:w-auto">
                        {renderNavItem(navItems[0])}
                    </div>
                    <Divider />
                    {}
                    <div
                        className="w-full sm:w-auto flex items-center px-2 py-1 sm:px-1 sm:py-0.5 gap-1 sm:gap-0.5">
                        {navItems.filter(i => i.group === "core").map(item => renderNavItem(item))}
                    </div>
                    <Divider />
                    {}
                    <div className="w-full sm:w-auto flex items-center gap-1 sm:gap-0.5">
                        {navItems.filter(i => i.group === "other").map(item => renderNavItem(item))}
                    </div>
                    <Divider />
                    {}
                    <div
                        className="w-full sm:w-auto flex items-center px-2 py-1 sm:px-1 sm:py-0.5 gap-1 sm:gap-0.5">
                        {navItems.filter(i => i.group === "lawyer").map(item => renderNavItem(item))}
                    </div>
                    {}
                    {isLoggedIn && <>
                        <Divider />
                        <div className="w-full sm:w-auto flex items-center gap-0.5 sm:hidden">
                            {user?.isLawyer && <Link
                                href="/lawyer"
                                className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <Briefcase className="w-4 h-4" />
                                <span>律师后台</span>
                            </Link>}
                            {user?.isGuardian && <Link
                                href="/guardian/center"
                                className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                <Shield className="w-4 h-4" />
                                <span>守护者</span>
                            </Link>}
                        </div>
                    </>}
                </nav>
            </div>
        </header>
    );
}