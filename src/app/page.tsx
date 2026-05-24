"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CursorFollower, ScrollProgress, TiltCard, AnimatedNumber } from "@/components/ui/animated-effects";
import { Footer } from "@/components/layout/footer";

import {
    ArrowRight,
    Shield,
    Clock,
    Lock,
    Award,
    FileCheck,
    Check,
    ShieldCheck,
    Headphones,
    CreditCard,
    Scale,
    Gavel,
    BookOpen,
    Users,
    TrendingUp,
    Clock3,
} from "lucide-react";

import Link from "next/link";

function TypewriterText(
    {
        text,
        delay = 0,
        onComplete
    }: {
        text: string;
        delay?: number;
        onComplete?: () => void;
    }
) {
    const [displayed, setDisplayed] = useState("");
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const startTimer = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(startTimer);
    }, [delay]);

    useEffect(() => {
        if (!started)
            return;

        if (displayed.length >= text.length) {
            onComplete?.();
            return;
        }

        const timer = setInterval(() => {
            setDisplayed(text.slice(0, displayed.length + 1));
        }, 80);

        return () => clearInterval(timer);
    }, [started, displayed, text, onComplete]);

    return (
        <span>
            {displayed}
            {displayed.length < text.length && <span className="animate-cursor-blink" />}
        </span>
    );
}

function ScrollReveal(
    {
        children,
        className = "",
        delay = 0,
        direction = "up"
    }: {
        children: React.ReactNode;
        className?: string;
        delay?: number;
        direction?: "up" | "down" | "left" | "right";
    }
) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        });

        if (ref.current)
            observer.observe(ref.current);

        return () => observer.disconnect();
    }, []);

    const transformMap = {
        up: "translateY(40px)",
        down: "translateY(-40px)",
        left: "translateX(40px)",
        right: "translateX(-40px)"
    };

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "none" : transformMap[direction],
                transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s ease-out ${delay}ms`
            }}>
            {children}
        </div>
    );
}

function FloatingParticle(
    {
        icon,
        className,
        style
    }: {
        icon: React.ReactNode;
        className?: string;
        style?: React.CSSProperties;
    }
) {
    return (
        <div
            className={`absolute text-orange-200/30 pointer-events-none ${className || ""}`}
            style={style}>
            {icon}
        </div>
    );
}

function WarningCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const warnings = [{
        icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "AI无法替代律师执业",
        content: "AI只能提供通用法律信息，无法针对具体案情提供具有法律效力的法律意见。刑事案件关乎人身自由，必须由持证律师提供专业服务。"
    }, {
        icon: <FileCheck className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "网络答案不可轻信",
        content: "网上搜索的答案良莠不齐，错误信息可能导致错失最佳时机。案件每一步都关乎当事人重大权益。"
    }, {
        icon: <Clock className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "黄金救援期不容错过",
        content: "刑事案件存在黄金37天救援期，专业律师介入越早，对当事人越有利。不要让犹豫耽误了最佳时机。"
    }];

    const DURATION = 5000;

    const goToNext = useCallback(() => {
        if (isAnimating)
            return;

        setIsAnimating(true);

        setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % warnings.length);
            setIsAnimating(false);
        }, 400);
    }, [isAnimating, warnings.length]);

    useEffect(() => {
        setProgress(0);
        const startTime = Date.now();

        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setProgress(Math.min(elapsed / DURATION * 100, 100));
        }, 50);

        const switchTimer = setTimeout(() => {
            goToNext();
        }, DURATION);

        return () => {
            clearInterval(intervalRef.current!);
            clearTimeout(switchTimer);
        };
    }, [currentIndex, goToNext]);

    const handleSelect = (index: number) => {
        if (isAnimating || index === currentIndex)
            return;

        setIsAnimating(true);

        setTimeout(() => {
            setCurrentIndex(index);
            setIsAnimating(false);
        }, 400);
    };

    return (
        <div className="max-w-4xl mx-auto relative px-2 sm:px-0">
            {warnings.map((warning, index) => <div
                key={index}
                className={`
                        w-full transition-all duration-500 ease-out
                        ${index === currentIndex ? isAnimating ? "animate-slide-out-scale" : "opacity-100 translate-y-0 scale-100" : "opacity-0 absolute inset-0 translate-y-8 scale-95 pointer-events-none"}
                    `}
                style={{
                    display: index === currentIndex ? "block" : "none",
                    animation: index === currentIndex && !isAnimating ? "slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined
                }}>
                <div
                    className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-orange-100 shadow-xl max-w-2xl mx-auto">
                    <div className="flex items-start gap-3 sm:gap-6">
                        <div
                            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white animate-elastic-bounce">
                            {warning.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3
                                className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 sm:mb-3">{warning.title}</h3>
                            <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">{warning.content}</p>
                        </div>
                    </div>
                </div>
            </div>)}
            <div className="flex justify-center gap-2 mt-6 sm:mt-8">
                {warnings.map((_, index) => <button
                    key={index}
                    onClick={() => handleSelect(index)}
                    className={`relative h-2.5 rounded-full overflow-hidden transition-all duration-300 ${index === currentIndex ? "w-12 sm:w-16 bg-orange-100" : "w-2.5 sm:w-3 bg-gray-300 hover:bg-gray-400"}`}>
                    {index === currentIndex && <div
                        className="absolute inset-y-0 left-0 bg-orange-500 rounded-full"
                        style={{
                            width: `${progress}%`
                        }} />}
                </button>)}
            </div>
        </div>
    );
}

function AuthoritySection() {
    const endorsements = [{
        badge: "司法认证",
        icon: <Award className="w-5 h-5 sm:w-6 sm:h-6" />,
        title: "持证律师团队",
        desc: "所有律师均持有中国律师执业证",
        gradient: "from-blue-500 to-cyan-500",
        light: "bg-blue-50",
        tag: "bg-blue-100 text-blue-700"
    }, {
        badge: "官方备案",
        icon: <FileCheck className="w-5 h-5 sm:w-6 sm:h-6" />,
        title: "正规法律平台",
        desc: "已合法ICP备案的法律科技平台",
        gradient: "from-emerald-500 to-teal-500",
        light: "bg-emerald-50",
        tag: "bg-emerald-100 text-emerald-700"
    }, {
        badge: "隐私保护",
        icon: <Lock className="w-5 h-5 sm:w-6 sm:h-6" />,
        title: "信息安全加密",
        desc: "采用银行级加密技术保护您的隐私",
        gradient: "from-rose-500 to-pink-500",
        light: "bg-rose-50",
        tag: "bg-rose-100 text-rose-700"
    }];

    return (
        <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden">
            <div
                className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-rose-50/30" />
            <div
                className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div
                    className="absolute top-20 left-10 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl animate-breathe" />
                <div
                    className="absolute bottom-20 right-10 w-48 h-48 bg-rose-200/20 rounded-full blur-3xl animate-breathe" />
            </div>
            <div className="container mx-auto px-4 relative z-10">
                <ScrollReveal className="text-center mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4">选择帮帮问法的理由</h2>
                    <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">专业、可信赖的法律咨询服务平台</p>
                </ScrollReveal>
                <div className="max-w-5xl mx-auto">
                    <div
                        className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-100 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-5">
                            <div
                                className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-500 to-rose-500 rounded-full -translate-y-1/2 translate-x-1/3" />
                            <div
                                className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-full translate-y-1/2 -translate-x-1/3" />
                        </div>
                        <div
                            className="relative z-10 grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                            {endorsements.map(
                                (item, index) => <ScrollReveal key={index} delay={index * 150} direction="up">
                                    <div
                                        className="group text-center p-4 sm:p-6 rounded-xl hover:bg-gray-50/80 transition-all duration-300 cursor-pointer"
                                        style={{
                                            boxShadow: "rgba(0, 0, 0, 0.15) 0px 2px 6px 0px"
                                        }}>
                                        <div
                                            className={`relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${item.gradient} rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4 sm:mb-5 animate-glow-pulse`}>
                                            <div className="text-white">
                                                {item.icon}
                                            </div>
                                            <div
                                                className={`absolute inset-0 ${item.gradient} rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
                                        </div>
                                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-4">
                                            {item.desc}
                                        </p>
                                        <span
                                            className={`inline-flex items-center gap-1.5 ${item.tag} px-3 py-1.5 rounded-full text-xs font-medium`}>
                                            <Check className="w-3.5 h-3.5" />
                                            {item.badge}
                                        </span>
                                    </div>
                                </ScrollReveal>
                            )}
                        </div>
                        <div className="mt-8 grid sm:grid-cols-2 gap-4 sm:gap-6">
                            <ScrollReveal delay={0} direction="up">
                                <Link href="/about">
                                    <div
                                        className="group relative bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer">
                                        <div className="p-5 sm:p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="relative flex-shrink-0">
                                                    <div
                                                        className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
                                                        style={{
                                                            backgroundColor: "#FFFFFF"
                                                        }}>
                                                        <img
                                                            src="/logo-bangbang.png"
                                                            alt="帮帮问法"
                                                            className="w-8 h-8 object-contain group-hover:animate-bounce-slow" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3
                                                        className="text-lg sm:text-xl font-bold text-white mb-1"
                                                        style={{
                                                            fontSize: "24px"
                                                        }}>了解帮帮
                                                                                                                                                                    </h3>
                                                    <p
                                                        className="text-sm text-amber-100 mb-3"
                                                        style={{
                                                            fontSize: "18px",
                                                            fontFamily: "\"Noto Serif SC\", serif"
                                                        }}>为什么选择我们？
                                                                                                                                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full"
                                                            style={{
                                                                fontSize: "14px"
                                                            }}>专业团队
                                                                                                                                                                                </span>
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full"
                                                            style={{
                                                                fontSize: "14px"
                                                            }}>隐私保密
                                                                                                                                                                                </span>
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full"
                                                            style={{
                                                                fontSize: "14px"
                                                            }}>快速响应
                                                                                                                                                                                </span>
                                                    </div>
                                                    <button
                                                        className="mt-2 flex items-center gap-2 bg-white text-amber-600 rounded-full px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all group-hover:gap-2.5">探索更多
                                                                                                                                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
                                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
                                    </div>
                                </Link>
                            </ScrollReveal>
                            <ScrollReveal delay={150} direction="up">
                                <Link href="/lawyer/join">
                                    <div
                                        className="group relative bg-gradient-to-br from-green-400 to-green-500 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer">
                                        <div className="p-5 sm:p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="relative flex-shrink-0">
                                                    <div
                                                        className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
                                                        style={{
                                                            backgroundColor: "#FFFFFF"
                                                        }}>
                                                        <span className="text-2xl group-hover:animate-bounce-slow">⚖️</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3
                                                        className="text-lg sm:text-xl font-bold text-white mb-1"
                                                        style={{
                                                            fontSize: "24px"
                                                        }}>律师入驻
                                                                                                                                                                    </h3>
                                                    <p
                                                        className="text-sm text-green-100 mb-3"
                                                        style={{
                                                            fontSize: "18px",
                                                            fontFamily: "\"Noto Serif SC\", serif"
                                                        }}>加入专业团队
                                                                                                                                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full"
                                                            style={{
                                                                fontSize: "14px"
                                                            }}>专属认证
                                                                                                                                                                                </span>
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full"
                                                            style={{
                                                                fontSize: "14px"
                                                            }}>流量扶持
                                                                                                                                                                                </span>
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full"
                                                            style={{
                                                                fontSize: "14px"
                                                            }}>智能匹配
                                                                                                                                                                                </span>
                                                    </div>
                                                    <button
                                                        className="mt-2 flex items-center gap-2 bg-white text-green-600 rounded-full px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all group-hover:gap-2.5">立即加入
                                                                                                                                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
                                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
                                    </div>
                                </Link>
                            </ScrollReveal>
                        </div>
                        <ScrollReveal delay={500} direction="up">
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-center">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        <span>平台担保交易</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Headphones className="w-4 h-4 text-blue-500" />
                                        <span>7×24 小时服务</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <CreditCard className="w-4 h-4 text-rose-500" />
                                        <span>安全支付保障</span>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FAQSection() {
    const [currentFAQ, setCurrentFAQ] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [progress, setProgress] = useState(0);

    const faqs = [{
        q: "咨询收费是一次性的吗？",
        a: "是的，每次咨询独立计费。您可以根据需要选择不同服务等级，费用透明，无隐藏收费。"
    }, {
        q: "律师回复需要多长时间？",
        a: "平台标准极速180秒内响应，为用户臻选律师，1对1解答指导。"
    }, {
        q: "委托律师后还需要额外付费吗？",
        a: "委托服务与律师协商确定委托相关的费用后，除开缴纳给国家机关的行政司法类规费，若出现其他额外支付的非法费用，平台会全程保障用户的权益。"
    }, {
        q: "我的隐私会受到保护吗？",
        a: "平台采用银行级加密技术，所有咨询内容严格保密。未经您的授权，不会向任何第三方透露。"
    }, {
        q: "可以指定特定领域的律师吗？",
        a: "可以。我们会根据您的案件类型匹配合适的专业律师，如需指定特定律师可在备注中说明。"
    }];

    const DURATION = 6000;

    const goToNextFAQ = useCallback(() => {
        if (isAnimating)
            return;

        setIsAnimating(true);

        setTimeout(() => {
            setCurrentFAQ(prev => (prev + 1) % faqs.length);
            setIsAnimating(false);
        }, 400);
    }, [isAnimating, faqs.length]);

    useEffect(() => {
        setProgress(0);
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setProgress(Math.min(elapsed / DURATION * 100, 100));
        }, 50);

        const switchTimer = setTimeout(() => {
            goToNextFAQ();
        }, DURATION);

        return () => {
            clearInterval(interval);
            clearTimeout(switchTimer);
        };
    }, [currentFAQ, goToNextFAQ]);

    return (
        <section className="py-12 sm:py-16 bg-gradient-to-b from-rose-50 to-white">
            <div className="container mx-auto px-4">
                <ScrollReveal className="max-w-4xl mx-auto">
                    <div
                        className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl shadow-xl p-6 sm:p-8 md:p-12 text-white relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                            <div
                                className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 animate-breathe" />
                            <div
                                className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2 animate-breathe" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                                <div className="flex-shrink-0">
                                    <div
                                        className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-glow-pulse">
                                        <svg
                                            className="w-10 h-10 sm:w-12 sm:h-12"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3">成为守护者，保护你最爱的人</h3>
                                    <p
                                        className="text-rose-100 text-sm sm:text-base md:text-lg leading-relaxed mb-4">将专属的守护二维码发给你要守护的人，成功绑定并享受法律服务，你可获得守护专属回报 <span className="font-bold text-yellow-300">100%</span>激励。即使不在身边，也能把TA守护！</p>
                                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                        <span
                                            className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs sm:text-sm">
                                            <span className="text-yellow-300">✓</span>零门槛加入
                                                                                                                                </span>
                                        <span
                                            className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs sm:text-sm">
                                            <span className="text-yellow-300">✓</span>审核后发放
                                                                                                                                </span>
                                        <span
                                            className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs sm:text-sm">
                                            <span className="text-yellow-300">✓</span>随时提现
                                                                                                                                </span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <Button
                                        size="lg"
                                        onClick={() => {
                                            const savedUser = localStorage.getItem("user_info");

                                            if (savedUser) {
                                                window.location.href = "/guardian/center";
                                            } else {
                                                window.dispatchEvent(new CustomEvent("open-login-modal"));
                                            }
                                        }}
                                        className="w-full sm:w-auto bg-white text-rose-600 hover:bg-rose-50 rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 sm:hover:scale-105 ripple-effect">立即加入
                                                                                                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                    <p className="text-center text-rose-200 text-xs mt-2">已有守护者中心 →</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            </div>
            <div className="container mx-auto px-4 mt-12 sm:mt-16">
                <ScrollReveal className="text-center mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4">常见问题</h2>
                    <div
                        className="w-20 h-1 bg-gradient-to-r from-orange-400 to-orange-600 mx-auto rounded-full" />
                </ScrollReveal>
                <div className="max-w-3xl mx-auto relative px-2 sm:px-0">
                    {faqs.map((faq, index) => <div
                        key={index}
                        className={`
                                w-full transition-all duration-500 ease-out
                                ${index === currentFAQ ? isAnimating ? "animate-slide-out-scale" : "opacity-100 translate-y-0 scale-100" : "opacity-0 absolute inset-0 translate-y-8 scale-95 pointer-events-none"}
                            `}
                        style={{
                            display: index === currentFAQ ? "block" : "none",
                            animation: index === currentFAQ && !isAnimating ? "slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined
                        }}>
                        <div
                            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg border border-gray-100 w-full max-w-2xl mx-auto">
                            <h3
                                className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 sm:mb-4 text-center animate-elastic-bounce">
                                {faq.q}
                            </h3>
                            <p
                                className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed text-center">
                                {faq.a}
                            </p>
                        </div>
                    </div>)}
                </div>
                <div className="flex justify-center gap-2 mt-6 sm:mt-8">
                    {faqs.map((_, index) => <button
                        key={index}
                        onClick={() => {
                            if (!isAnimating && index !== currentFAQ) {
                                setIsAnimating(true);

                                setTimeout(() => {
                                    setCurrentFAQ(index);
                                    setIsAnimating(false);
                                }, 400);
                            }
                        }}
                        className={`relative h-2.5 rounded-full overflow-hidden transition-all duration-300 ${index === currentFAQ ? "w-12 sm:w-16 bg-orange-100" : "w-2.5 sm:w-3 bg-gray-300 hover:bg-gray-400"}`}>
                        {index === currentFAQ && <div
                            className="absolute inset-y-0 left-0 bg-orange-500 rounded-full"
                            style={{
                                width: `${progress}%`
                            }} />}
                    </button>)}
                </div>
            </div>
        </section>
    );
}



export default function Home() {
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);
    const [titlePhase, setTitlePhase] = useState(0);
    const [cardsVisible, setCardsVisible] = useState(false);

    const featureCards = [{
        icon: "💔",
        title: "离婚纠纷",
        desc: "财产分割、子女抚养困扰",
        gradient: "from-blue-50 to-blue-100/50",
        border: "border-blue-200"
    }, {
        icon: "💰",
        title: "债务追讨",
        desc: "借款不还、合同违约纠纷",
        gradient: "from-teal-50 to-teal-100/50",
        border: "border-teal-200"
    }, {
        icon: "🚔",
        title: "公安突然抓捕",
        desc: "惊慌失措，不知如何应对",
        gradient: "from-red-50 to-red-100/50",
        border: "border-red-200"
    }, {
        icon: "🔒",
        title: "被拘留37天",
        desc: "焦虑等待，不知能否取保",
        gradient: "from-amber-50 to-amber-100/50",
        border: "border-amber-200"
    }, {
        icon: "📜",
        title: "等待判决",
        desc: "判决未知，前途未卜",
        gradient: "from-rose-50 to-rose-100/50",
        border: "border-rose-200"
    }];

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const timer1 = setTimeout(() => setTitlePhase(1), 2000);
        const timer2 = setTimeout(() => setTitlePhase(2), 3500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setCardsVisible(true), 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen">
            <section
                className="relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #FFF8F5 0%, #FFFBF9 50%, #FFFFFF 100%)"
                }}>
                <div
                    className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-orange-50/30 to-amber-50/20" />
                <div
                    className="absolute top-20 left-10 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl animate-breathe" />
                <div
                    className="absolute bottom-10 right-10 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl animate-breathe"
                    style={{
                        animationDelay: "1s"
                    }} />
                <div
                    className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-amber-100/30 rounded-full blur-3xl animate-breathe"
                    style={{
                        animationDelay: "2s"
                    }} />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-orange-100/20 to-rose-100/20 rounded-full blur-3xl" />
                <div
                    className="absolute top-1/4 left-0 w-px h-32 bg-gradient-to-b from-transparent via-orange-300/50 to-transparent" />
                <div
                    className="absolute bottom-1/4 right-0 w-px h-24 bg-gradient-to-b from-transparent via-rose-300/50 to-transparent" />
                <FloatingParticle
                    icon={<Scale className="w-8 h-8" />}
                    className="animate-particle-float-1"
                    style={{
                        top: "15%",
                        left: "5%"
                    }} />
                <FloatingParticle
                    icon={<Gavel className="w-6 h-6" />}
                    className="animate-particle-float-2"
                    style={{
                        top: "25%",
                        right: "8%"
                    }} />
                <FloatingParticle
                    icon={<BookOpen className="w-7 h-7" />}
                    className="animate-particle-float-3"
                    style={{
                        bottom: "20%",
                        left: "10%"
                    }} />
                <FloatingParticle
                    icon={<Shield className="w-5 h-5" />}
                    className="animate-particle-float-4"
                    style={{
                        bottom: "30%",
                        right: "15%"
                    }} />
                <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16 relative z-10">
                    <div
                        className="grid lg:grid-cols-2 gap-8 lg:gap-20 items-center max-w-6xl mx-auto">
                        <div
                            className="text-center lg:text-left order-2 lg:order-1 space-y-6 sm:space-y-8">
                            <div className="animate-fade-in-up inline-block">
                                <div
                                    className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-full px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 shadow-lg shadow-orange-200/50 hover:shadow-xl hover:shadow-orange-300/50 transition-all duration-300 hover:scale-105 cursor-pointer">
                                    <Image
                                        src="/logo.png"
                                        alt="帮帮问法"
                                        width={28}
                                        height={28}
                                        className="h-7 w-7 sm:h-9 sm:w-9" />
                                    <span className="text-white font-bold text-sm sm:text-lg">帮帮问法</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h1
                                    className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-tight transition-all duration-300"
                                    style={{
                                        animation: titlePhase >= 0 ? "fadeInUp 0.8s ease-out forwards" : "none",
                                        opacity: titlePhase >= 0 ? 1 : 0,
                                        background: "linear-gradient(135deg, #1a1a1a 0%, #333333 50%, #1a1a1a 100%)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        textShadow: "0 2px 10px rgba(0,0,0,0.1)"
                                    }}>
                                    <TypewriterText text="AI千问" delay={300} />
                                </h1>
                                <h1
                                    className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-tight"
                                    style={{
                                        animation: titlePhase >= 1 ? "fadeInUp 0.8s ease-out 0.2s forwards" : "none",
                                        opacity: titlePhase >= 1 ? 1 : 0
                                    }}>
                                    <span
                                        className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent"
                                        style={{
                                            textShadow: "none"
                                        }}>不如</span>
                                    <span
                                        className="text-gray-900"
                                        style={{
                                            background: "linear-gradient(135deg, #1a1a1a 0%, #333333 50%, #1a1a1a 100%)",
                                            WebkitBackgroundClip: "text",
                                            WebkitTextFillColor: "transparent"
                                        }}>律师一言</span>
                                </h1>
                            </div>
                            <p
                                className="text-base sm:text-xl md:text-2xl font-semibold animate-float-emphasis"
                                style={{
                                    animation: titlePhase >= 2 ? "fadeInUp 0.8s ease-out 0.3s forwards, floatEmphasis 3s ease-in-out 1s infinite" : "none",
                                    opacity: titlePhase >= 2 ? 1 : 0
                                }}>
                                <span
                                    className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent font-bold">AI很好，但承担不了责任</span>
                            </p>
                            <div
                                className="space-y-1 text-sm sm:text-base md:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0"
                                style={{
                                    animation: titlePhase >= 2 ? "fadeInUp 0.8s ease-out 0.5s forwards" : "none",
                                    opacity: titlePhase >= 2 ? 1 : 0
                                }}>
                                <p
                                    className="text-gray-500 animate-float-emphasis"
                                    style={{
                                        animationDelay: "0.5s"
                                    }}>AI的答案错了，它随时可以更改</p>
                                <p
                                    className="text-gray-500 animate-float-emphasis"
                                    style={{
                                        animationDelay: "0.7s"
                                    }}>你按照错的答案去做了</p>
                                <p
                                    className="text-gray-600 font-semibold animate-float-emphasis"
                                    style={{
                                        animationDelay: "0.9s"
                                    }}>你一辈子无法撤回</p>
                            </div>
                            {mounted && <div
                                className="pt-2 sm:pt-4"
                                style={{
                                    animation: "fadeInUp 0.8s ease-out 0.7s forwards",
                                    opacity: 0
                                }}>
                                <div
                                    className="relative w-full p-4 rounded-2xl bg-white/40 backdrop-blur-md border border-white/50 shadow-lg">
                                    <div
                                        className="flex flex-col sm:flex-row gap-3 items-stretch lg:items-start">
                                        <div className="w-full sm:w-auto relative group">
                                            <div
                                                className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                                            <Link href="/civil" className="block w-full">
                                                <Button
                                                    size="lg"
                                                    className="w-full sm:w-auto relative bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-full px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-6 text-base sm:text-lg font-semibold h-auto shadow-xl shadow-blue-200/50 transition-all duration-300 active:scale-95 sm:hover:scale-105 sm:hover:shadow-2xl sm:hover:shadow-blue-300/50 ripple-effect">民事咨询
                                                                                                                                                                <ArrowRight
                                                        className="ml-2 sm:ml-3 h-5 sm:h-6 w-5 sm:w-6 group-hover:translate-x-1 transition-transform duration-300" />
                                                </Button>
                                            </Link>
                                        </div>
                                        <div className="w-full sm:w-auto relative group">
                                            <div
                                                className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                                            <Link href="/consult" className="block w-full">
                                                <Button
                                                    size="lg"
                                                    className="w-full sm:w-auto relative bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-full px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-6 text-base sm:text-lg font-semibold h-auto shadow-xl shadow-orange-200/50 transition-all duration-300 active:scale-95 sm:hover:scale-105 sm:hover:shadow-2xl sm:hover:shadow-orange-300/50 ripple-effect">刑事咨询
                                                                                                                                                                <ArrowRight
                                                        className="ml-2 sm:ml-3 h-5 sm:h-6 w-5 sm:w-6 group-hover:translate-x-1 transition-transform duration-300" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>}
                        </div>
                        <div className="flex flex-col gap-3 sm:gap-4 order-1 lg:order-2">
                            {featureCards.map((card, index) => <div
                                key={index}
                                className={`
                                        w-full rounded-2xl sm:rounded-3xl
                                        ${cardsVisible ? `animate-card-fly-in-${index + 1}` : "opacity-0 translate-x-full"}
                                    `}>
                                <TiltCard className="h-full">
                                    <div
                                        className={`
                                                h-full rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 
                                                bg-gradient-to-br ${card.gradient} 
                                                border ${card.border} shadow-lg
                                                transition-all duration-500 ease-out cursor-pointer hover:shadow-2xl
                                                ${hoveredCard === index ? "scale-[1.02] -translate-y-1" : ""}
                                            `}
                                        onMouseEnter={() => setHoveredCard(index)}
                                        onMouseLeave={() => setHoveredCard(null)}>
                                        <div
                                            className={`flex items-center gap-2 sm:gap-3 transform transition-transform duration-300 ${hoveredCard === index ? "scale-[1.02]" : ""}`}>
                                            <div
                                                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-md transition-all duration-300 ${hoveredCard === index ? "scale-110 shadow-lg rotate-3" : ""}`}>
                                                <span
                                                    className={`text-xl sm:text-2xl transition-transform duration-300 ${hoveredCard === index ? "animate-elastic-bounce" : "animate-float-emphasis"}`}>
                                                    {card.icon}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm sm:text-base md:text-lg text-gray-800">{card.title}</h4>
                                                <p className="text-xs sm:text-sm text-gray-500 truncate">{card.desc}</p>
                                            </div>
                                        </div>
                                        <div
                                            className={`absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-500 ${hoveredCard === index ? "opacity-100" : ""}`} />
                                        <div
                                            className="absolute inset-0 rounded-2xl sm:rounded-3xl hover-ripple opacity-0" />
                                    </div>
                                </TiltCard>
                            </div>)}
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-20 md:py-28 bg-white">
                <div className="container mx-auto px-4">
                    <ScrollReveal className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">简单四步，获得专业法律建议</h2>
                        <p className="text-gray-500">按照指引完成咨询，律师将尽快为您解答</p>
                    </ScrollReveal>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
                        {[{
                            step: "1",
                            title: "选择案件类型",
                            desc: "民事或刑事案件分类",
                            icon: <Scale className="w-6 h-6" />
                        }, {
                            step: "2",
                            title: "描述案情",
                            desc: "详细说明案件情况",
                            icon: <FileCheck className="w-6 h-6" />
                        }, {
                            step: "3",
                            title: "选择服务",
                            desc: "咨询或委托代理",
                            icon: <Check className="w-6 h-6" />
                        }, {
                            step: "4",
                            title: "完成支付",
                            desc: "获得律师解答",
                            icon: <Shield className="w-6 h-6" />
                        }].map(
                            (item, index) => <ScrollReveal key={item.step} delay={index * 100} direction="up">
                                <div
                                    className="group relative bg-white rounded-2xl p-6 md:p-8 text-center border-2 border-gray-100 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer hover-ripple">
                                    <div
                                        className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 text-white text-xl font-bold flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-orange-200/50">
                                        <span className="animate-number-pop">{item.step}</span>
                                    </div>
                                    <h3
                                        className="font-bold text-lg text-black mb-2 group-hover:text-orange-500 transition-colors duration-300">{item.title}</h3>
                                    <p className="text-sm text-gray-500">{item.desc}</p>
                                    <div
                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent group-hover:w-full transition-all duration-500 rounded-full" />
                                </div>
                            </ScrollReveal>
                        )}
                    </div>
                    <ScrollReveal className="text-center mt-12" delay={400}>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
                            <Link href="/civil" className="w-full sm:w-auto">
                                <div className="w-full sm:w-auto relative group">
                                    <div
                                        className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                                    <Button
                                        size="lg"
                                        className="w-full sm:w-auto relative bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-full px-10 py-5 text-lg font-semibold h-auto shadow-xl shadow-blue-200/50 transition-all duration-300 active:scale-95 sm:hover:scale-105 sm:hover:shadow-2xl sm:hover:shadow-blue-300/50 ripple-effect">民事咨询
                                                                                                                        <ArrowRight
                                            className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                                    </Button>
                                </div>
                            </Link>
                            <Link href="/consult" className="w-full sm:w-auto">
                                <div className="w-full sm:w-auto relative group">
                                    <div
                                        className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                                    <Button
                                        size="lg"
                                        className="w-full sm:w-auto relative bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-full px-10 py-5 text-lg font-semibold h-auto shadow-xl shadow-orange-200/50 transition-all duration-300 active:scale-95 sm:hover:scale-105 sm:hover:shadow-2xl sm:hover:shadow-orange-300/50 ripple-effect">刑事咨询
                                                                                                                        <ArrowRight
                                            className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                                    </Button>
                                </div>
                            </Link>
                        </div>
                    </ScrollReveal>
                </div>
            </section>
            <section
                className="py-12 sm:py-16 bg-gradient-to-br from-rose-50 via-orange-50/50 to-amber-50/30 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div
                        className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl animate-breathe" />
                    <div
                        className="absolute bottom-0 right-1/4 w-72 h-72 bg-rose-200/30 rounded-full blur-3xl animate-breathe"
                        style={{
                            animationDelay: "2s"
                        }} />
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-100/20 rounded-full blur-3xl animate-breathe"
                        style={{
                            animationDelay: "4s"
                        }} />
                </div>
                <div className="container mx-auto px-4 relative z-10">
                    <div
                        className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
                        {[{
                            icon: <Users className="w-6 h-6" />,
                            value: 5000,
                            suffix: "+",
                            label: "服务用户"
                        }, {
                            icon: <Shield className="w-6 h-6" />,
                            value: 98,
                            suffix: "%",
                            label: "好评率"
                        }, {
                            icon: <Clock3 className="w-6 h-6" />,
                            value: 24,
                            suffix: "h",
                            label: "在线时间"
                        }, {
                            icon: <TrendingUp className="w-6 h-6" />,
                            value: 91,
                            suffix: "%",
                            label: "口碑转化"
                        }].map(
                            (stat, index) => <ScrollReveal key={index} delay={index * 100} direction="up">
                                <div className="text-center group">
                                    <div
                                        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/60 backdrop-blur-sm mb-3 group-hover:scale-110 group-hover:bg-orange-100/80 transition-all duration-300 shadow-lg">
                                        <div className="text-orange-600 group-hover:text-orange-700 transition-colors">
                                            {stat.icon}
                                        </div>
                                    </div>
                                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-1">
                                        <AnimatedNumber target={stat.value} suffix={stat.suffix} className="animate-number-pop" />
                                    </div>
                                    <div className="text-sm sm:text-base text-gray-600">{stat.label}</div>
                                </div>
                            </ScrollReveal>
                        )}
                    </div>
                </div>
            </section>
            <section className="py-12 sm:py-16 bg-gradient-to-b from-orange-50/50 to-white">
                <ScrollReveal className="text-center mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4">重要提醒</h2>
                    <div
                        className="w-20 h-1 bg-gradient-to-r from-orange-400 to-orange-600 mx-auto rounded-full" />
                </ScrollReveal>
                <WarningCarousel />
            </section>
            <AuthoritySection />
            <FAQSection />

            <CursorFollower />
            <ScrollProgress />
            <Footer />
        </div>
    );
}