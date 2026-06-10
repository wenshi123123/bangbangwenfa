"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CursorFollower, ScrollProgress, AnimatedNumber } from "@/components/ui/animated-effects";
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
            className={`absolute text-[var(--terracotta)]/20 pointer-events-none ${className || ""}`}
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
        if (isAnimating) return;
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
        const switchTimer = setTimeout(() => { goToNext(); }, DURATION);
        return () => { clearInterval(intervalRef.current!); clearTimeout(switchTimer); };
    }, [currentIndex, goToNext]);

    const handleSelect = (index: number) => {
        if (isAnimating || index === currentIndex) return;
        setIsAnimating(true);
        setTimeout(() => { setCurrentIndex(index); setIsAnimating(false); }, 400);
    };

    return (
        <div className="max-w-4xl mx-auto relative px-2 sm:px-0">
            {warnings.map((warning, index) => (
                <div key={index}
                    className={`w-full transition-all duration-500 ease-out ${index === currentIndex ? isAnimating ? "animate-slide-out-scale" : "opacity-100 translate-y-0 scale-100" : "opacity-0 absolute inset-0 translate-y-8 scale-95 pointer-events-none"}`}
                    style={{
                        display: index === currentIndex ? "block" : "none",
                        animation: index === currentIndex && !isAnimating ? "slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined
                    }}>
                    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-[rgba(196,115,83,0.2)] shadow-xl max-w-2xl mx-auto">
                        <div className="flex items-start gap-3 sm:gap-6">
                            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#C47353] to-[#D4957A] rounded-lg sm:rounded-xl flex items-center justify-center text-white animate-elastic-bounce">
                                {warning.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base sm:text-lg md:text-xl font-bold font-serif text-[#3D322D] mb-2 sm:mb-3">{warning.title}</h3>
                                <p className="text-xs sm:text-sm md:text-base text-[#8C7B6E] leading-relaxed">{warning.content}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            <div className="flex justify-center gap-2 mt-6 sm:mt-8">
                {warnings.map((_, index) => (
                    <button key={index}
                        onClick={() => handleSelect(index)}
                        className={`relative h-2.5 rounded-full overflow-hidden transition-all duration-300 ${index === currentIndex ? "w-12 sm:w-16 bg-[#FAF7F2]" : "w-2.5 sm:w-3 bg-[#8C7B6E]/30 hover:bg-[#8C7B6E]/50"}`}>
                        {index === currentIndex && <div className="absolute inset-y-0 left-0 bg-[#C47353] rounded-full" style={{ width: `${progress}%` }} />}
                    </button>
                ))}
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
        gradient: "from-[#D4957A] to-[#C47353]",
        light: "bg-[#FAF7F2]",
        tag: "bg-[#FAF7F2] text-[#C47353]"
    }, {
        badge: "官方备案",
        icon: <FileCheck className="w-5 h-5 sm:w-6 sm:h-6" />,
        title: "正规法律平台",
        desc: "已合法ICP备案的法律科技平台",
        gradient: "from-[#C47353] to-[#A85D40]",
        light: "bg-[#FAF7F2]",
        tag: "bg-[#FAF7F2] text-[#C47353]"
    }, {
        badge: "隐私保护",
        icon: <Lock className="w-5 h-5 sm:w-6 sm:h-6" />,
        title: "信息安全加密",
        desc: "采用银行级加密技术保护您的信息",
        gradient: "from-[#A85D40] to-[#C47353]",
        light: "bg-[#FAF7F2]",
        tag: "bg-[#FAF7F2] text-[#C47353]"
    }];

    return (
        <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden" style={{ background: "var(--paper-dark)" }}>
            <div
                className="absolute inset-0"
                style={{ background: "var(--paper)" }} />
            <div
                className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div
                    className="absolute top-20 left-10 w-64 h-64 bg-[#C47353]/[0.04] rounded-full blur-3xl animate-breathe" />
                <div
                    className="absolute bottom-20 right-10 w-48 h-48 bg-[#D4957A]/[0.05] rounded-full blur-3xl animate-breathe"
                    style={{ animationDelay: "1s" }} />
            </div>
            <div className="container mx-auto px-4 relative z-10">
                <ScrollReveal className="text-center mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#3D322D] mb-4">选择帮帮问法的理由</h2>
                    <p className="text-sm sm:text-base text-[#8C7B6E] max-w-2xl mx-auto px-4">专业、可信赖的法律咨询服务平台</p>
                </ScrollReveal>
                <div className="max-w-5xl mx-auto">
                    <div
                        className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 border border-[rgba(196,115,83,0.15)] relative overflow-hidden">
                        <div className="absolute inset-0 opacity-5">
                            <div
                                className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[#D4957A] to-[#C47353] rounded-full -translate-y-1/2 translate-x-1/3" />
                            <div
                                className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-[#D4957A] to-[#C47353] rounded-full translate-y-1/2 -translate-x-1/3" />
                        </div>
                        <div
                            className="relative z-10 grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                            {endorsements.map(
                                (item, index) => <ScrollReveal key={index} delay={index * 150} direction="up">
                                    <div
                                        className="group text-center p-4 sm:p-6 rounded-xl hover:bg-[#FAF7F2]/80 transition-all duration-300 cursor-pointer"
                                        style={{
                                            boxShadow: "0 1px 2px rgba(61,50,45,0.03), 0 4px 16px rgba(61,50,45,0.06), 0 12px 40px rgba(61,50,45,0.03)"
                                        }}>
                                        <div
                                            className={`relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${item.gradient} rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4 sm:mb-5 animate-glow-pulse`}>
                                            <div className="text-white">
                                                {item.icon}
                                            </div>
                                            <div
                                                className={`absolute inset-0 ${item.gradient} rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
                                        </div>
                                        <h3 className="text-base sm:text-lg md:text-xl font-serif text-[#3D322D] mb-2">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-[#8C7B6E] leading-relaxed mb-4">
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
                                        className="group relative bg-gradient-to-br from-[#C47353] to-[#A85D40] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer">
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
                                                        className="text-xl sm:text-2xl font-bold text-white mb-1">了解帮帮
                                                                                                                                                                    </h3>
                                                    <p
                                                        className="text-base text-[#FAF7F2] mb-3 font-medium">为什么选择我们？
                                                                                                                                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">专业团队
                                                                                                                                                                                </span>
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">隐私保密
                                                                                                                                                                                </span>
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">快速响应
                                                                                                                                                                                </span>
                                                    </div>
                                                    <button
                                                        className="mt-2 flex items-center gap-2 bg-white text-[#C47353] rounded-full px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all group-hover:gap-2.5">探索更多
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
                                        className="group relative bg-gradient-to-br from-[#D4957A] to-[#C47353] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer">
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
                                                        className="text-xl sm:text-2xl font-bold text-white mb-1">律师入驻
                                                                                                                                                                    </h3>
                                                    <p
                                                        className="text-base text-[#FAF7F2] mb-3 font-medium">加入专业团队
                                                                                                                                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">专属认证
                                                                                                                                                                                </span>
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">流量扶持
                                                                                                                                                                                </span>
                                                        <span
                                                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">智能匹配
                                                                                                                                                                                </span>
                                                    </div>
                                                    <button
                                                        className="mt-2 flex items-center gap-2 bg-white text-[#C47353] rounded-full px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all group-hover:gap-2.5">立即加入
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
                            <div className="mt-8 pt-6 border-t border-[rgba(196,115,83,0.15)]">
                                <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-center">
                                    <div className="flex items-center gap-2 text-sm text-[#8C7B6E]">
                                        <ShieldCheck className="w-4 h-4 text-[#C47353]" />
                                        <span>平台担保交易</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-[#8C7B6E]">
                                        <Headphones className="w-4 h-4 text-[#D4957A]" />
                                        <span>7×24 小时服务</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-[#8C7B6E]">
                                        <CreditCard className="w-4 h-4 text-[#A85D40]" />
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
    const [openIndex, setOpenIndex] = useState<number | null>(null);

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

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-12 sm:py-16" style={{ background: "linear-gradient(to bottom, var(--paper-dark), white)" }}>
            <div className="container mx-auto px-4">
                <ScrollReveal className="text-center mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#3D322D] mb-4">常见问题</h2>
                    <div
                        className="w-20 h-1 mx-auto rounded-full"
                        style={{ background: "linear-gradient(to right, var(--terracotta), var(--terracotta-dark))" }} />
                </ScrollReveal>
                <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4 px-2 sm:px-0">
                    {faqs.map((faq, index) => (
                        <ScrollReveal key={index} delay={index * 80} direction="up">
                            <div className="bg-white rounded-xl sm:rounded-2xl shadow-md border border-[rgba(196,115,83,0.15)] overflow-hidden transition-all duration-300">
                                <button
                                    onClick={() => toggleFAQ(index)}
                                    className="w-full flex items-center justify-between p-4 sm:p-6 text-left focus:outline-none focus:ring-2 focus:ring-[#C47353] focus:ring-inset"
                                    aria-expanded={openIndex === index}
                                >
                                    <h3 className="text-sm sm:text-base md:text-lg font-medium text-[#3D322D] pr-4">{faq.q}</h3>
                                    <div className={`flex-shrink-0 w-5 h-5 text-[#C47353] transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""}`}>
                                        <svg viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-out ${openIndex === index ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
                                >
                                    <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                                        <p className="text-xs sm:text-sm md:text-base text-[#8C7B6E] leading-relaxed">{faq.a}</p>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}


const heroImages = [
    { src: "/hero-1.jpg", alt: "律师咨询服务 - 专业法律团队" },
    { src: "/hero-2.jpg", alt: "律师咨询服务 - 解读案情" },
    { src: "/hero-3.jpg", alt: "律师咨询服务 - 法律保障" },
];

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const [titlePhase, setTitlePhase] = useState(0);
    const [currentImage, setCurrentImage] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (paused) return;
        const timer = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % heroImages.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [paused]);

    useEffect(() => {
        const timer1 = setTimeout(() => setTitlePhase(1), 1000);
        const timer2 = setTimeout(() => setTitlePhase(2), 1800);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    return (
        <div className="min-h-screen">
            <section
                className="relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 50%, #FFFFFF 100%)"
                }}>
                <div
                    className="absolute inset-0 bg-gradient-to-br from-[#C47353]/[0.03] via-[#D4957A]/[0.02] to-transparent" />
                <div
                    className="absolute top-20 left-10 w-72 h-72 bg-[#C47353]/[0.04] rounded-full blur-3xl animate-breathe" />
                <div
                    className="absolute bottom-10 right-10 w-96 h-96 bg-[#D4957A]/[0.03] rounded-full blur-3xl animate-breathe"
                    style={{
                        animationDelay: "1s"
                    }} />
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
                        {/* 左侧文字内容 */}
                        <div
                            className="text-center lg:text-left order-2 lg:order-1 space-y-6 sm:space-y-8">
                            <div className="animate-fade-in-up inline-block">
                                <div
                                    className="rounded-full px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 shadow-lg"
                                    style={{
                                        background: "linear-gradient(to bottom right, var(--terracotta-light), var(--terracotta))",
                                        boxShadow: "0 2px 8px rgba(196,115,83,0.25), 0 4px 16px rgba(196,115,83,0.12), inset 0 1px 0 rgba(255,255,255,0.25)"
                                    }}>
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
                                    className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] leading-tight transition-all duration-300 font-serif"
                                    style={{
                                        animation: titlePhase >= 0 ? "fadeInUp 0.8s ease-out forwards" : "none",
                                        opacity: titlePhase >= 0 ? 1 : 0,
                                        fontFamily: "var(--font-serif)",
                                        color: "var(--ink)"
                                    }}>
                                    <TypewriterText text="AI千问" delay={300} />
                                </h1>
                                <h1
                                    className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] leading-tight font-serif"
                                    style={{
                                        animation: titlePhase >= 1 ? "fadeInUp 0.8s ease-out 0.2s forwards" : "none",
                                        opacity: titlePhase >= 1 ? 1 : 0,
                                        fontFamily: "var(--font-serif)",
                                        color: "var(--ink)"
                                    }}>
                                    <span style={{ color: "var(--terracotta)" }}>不如</span>
                                    <span style={{ color: "var(--ink)" }}>律师一言</span>
                                </h1>
                            </div>
                            <p
                                className="text-base sm:text-xl md:text-2xl"
                                style={{
                                    animation: titlePhase >= 2 ? "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards" : "none",
                                    opacity: titlePhase >= 2 ? 1 : 0
                                }}>
                                <span
                                    style={{
                                        background: "linear-gradient(135deg, var(--terracotta), var(--terracotta-dark))",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        fontWeight: "bold"
                                    }}>AI很好，但承担不了责任</span>
                            </p>
                            <div
                                className="space-y-1 sm:space-y-2.5 text-sm sm:text-base md:text-lg lg:text-[20px] leading-relaxed sm:leading-loose max-w-lg mx-auto lg:mx-0"
                                style={{
                                    opacity: titlePhase >= 2 ? 1 : 0
                                }}>
                                <p
                                    className="text-[#8C7B6E]"
                                    style={{
                                        animation: titlePhase >= 2 ? "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards" : "none",
                                        opacity: titlePhase >= 2 ? 1 : 0
                                    }}>AI的答案错了，它随时可以更改</p>
                                <p
                                    className="text-[#8C7B6E]"
                                    style={{
                                        animation: titlePhase >= 2 ? "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.7s forwards" : "none",
                                        opacity: titlePhase >= 2 ? 1 : 0
                                    }}>你按照错的答案去做了</p>
                                <p
                                    className="text-[#3D322D] font-semibold lg:text-[22px]"
                                    style={{
                                        animation: titlePhase >= 2 ? "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.9s forwards" : "none",
                                        opacity: titlePhase >= 2 ? 1 : 0
                                    }}>你一辈子无法撤回</p>
                            </div>
                            {mounted && <div
                                className="pt-2 sm:pt-4"
                                style={{
                                    animation: "fadeInUp 0.8s ease-out 0.7s forwards",
                                    opacity: 0
                                }}>
                                <div
                                    className="relative w-full p-2 sm:p-3 rounded-xl"
                                    style={{
                                        background: "rgba(250,247,242,0.4)",
                                        backdropFilter: "blur(12px)",
                                        border: "1px solid rgba(255,255,255,0.5)",
                                        boxShadow: "0 1px 2px rgba(61,50,45,0.03)"
                                    }}>
                                    <div
                                        className="flex flex-col sm:flex-row gap-2.5 items-stretch lg:items-start">
                                        <div className="w-full sm:w-auto relative group">
                                            <div
                                                className="absolute -inset-0.5 bg-gradient-to-r from-[#D4957A] to-[#C47353] rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                                            <Link href="/civil" className="block w-full">
                                                <Button
                                                    size="default"
                                                    className="w-full sm:w-auto relative bg-gradient-to-r from-[#D4957A] to-[#C47353] hover:from-[#C47353] hover:to-[#A85D40] text-white rounded-full px-4 sm:px-6 py-2 sm:py-2.5 text-sm md:text-base font-medium h-auto shadow-md shadow-[#C47353]/20 transition-all duration-300 active:scale-95 sm:hover:scale-105 sm:hover:shadow-lg sm:hover:shadow-[#C47353]/30 ripple-effect">民事咨询
                                                <ArrowRight
                                                        className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                                                </Button>
                                            </Link>
                                        </div>
                                        <div className="w-full sm:w-auto relative group">
                                            <div
                                                className="absolute -inset-0.5 bg-gradient-to-r from-[#A85D40] to-[#8C7B6E] rounded-full blur opacity-10 group-hover:opacity-25 transition-opacity duration-500" />
                                            <Link href="/consult" className="block w-full">
                                                <Button
                                                    size="default"
                                                    className="w-full sm:w-auto relative bg-white text-[#A85D40] border-2 border-[#A85D40] hover:bg-[#A85D40] hover:text-white rounded-full px-4 sm:px-6 py-2 sm:py-2.5 text-sm md:text-base font-medium h-auto shadow-md shadow-[#A85D40]/10 hover:shadow-lg hover:shadow-[#A85D40]/20 transition-all duration-300 active:scale-95 sm:hover:scale-105 ripple-effect">刑事咨询
                                                <ArrowRight
                                                        className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>}
                        </div>
                        {/* 右侧轮播图 */}
                        <div className="relative order-1 lg:order-2 animate-fade-in-up opacity-0 [animation-delay:600ms] [animation-fill-mode:forwards]">
                            {/* Hero Image Carousel */}
                            <div
                                className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl"
                                style={{ aspectRatio: "4/5", maxHeight: "650px" }}
                                onMouseEnter={() => setPaused(true)}
                                onMouseLeave={() => setPaused(false)}
                            >
                                <div className="relative w-full h-full">
                                    {heroImages.map((img, i) => (
                                        <div
                                            key={i}
                                            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                                                currentImage === i ? "opacity-100 z-10" : "opacity-0 z-0"
                                            }`}
                                        >
                                            <Image
                                                src={img.src}
                                                alt={img.alt}
                                                width={600}
                                                height={750}
                                                className="w-full h-full object-cover"
                                                style={{ maxHeight: "650px" }}
                                                priority={i === 0}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {/* Gradient overlays */}
                                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-t from-[#C47353]/20 via-transparent to-transparent pointer-events-none z-10" />
                                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#3D322D]/10 to-transparent pointer-events-none z-10" />
                                {/* Carousel dots */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                                    {heroImages.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { setCurrentImage(i); setPaused(true); }}
                                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                                currentImage === i
                                                    ? "bg-white w-6 shadow-lg"
                                                    : "bg-white/50 hover:bg-white/80"
                                            }`}
                                            aria-label={`切换到第 ${i + 1} 张图片`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Steps Section */}
            <section className="py-20 md:py-28 bg-white">
                <div className="container mx-auto px-4">
                    <ScrollReveal className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-serif text-[#3D322D] mb-3">简单四步，获得专业法律建议</h2>
                        <p className="text-[#8C7B6E]">按照指引完成咨询，律师将尽快为您解答</p>
                    </ScrollReveal>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
                        {[{
                            step: "一",
                            title: "选择案件类型",
                            desc: "民事或刑事案件分类",
                            icon: <Scale className="w-6 h-6" />
                        }, {
                            step: "二",
                            title: "描述案情",
                            desc: "文字、语音、图片，自由描述",
                            icon: <FileCheck className="w-6 h-6" />
                        }, {
                            step: "三",
                            title: "智能匹配律师",
                            desc: "查看资质、评分，自主匹配",
                            icon: <Check className="w-6 h-6" />
                        }, {
                            step: "四",
                            title: "完成支付",
                            desc: "安全支付，即刻开始咨询",
                            icon: <Shield className="w-6 h-6" />
                        }].map(
                            (item, index) => <ScrollReveal key={item.step} delay={index * 100} direction="up">
                                <div
                                    className="group relative bg-white rounded-2xl p-6 md:p-8 text-center border-2 border-[rgba(196,115,83,0.1)] hover:border-[#C47353] hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer hover-ripple">
                                    <div
                                        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D4957A] to-[#C47353] text-white text-xl font-bold flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-[#C47353]/30"
                                        style={{ fontFamily: "var(--font-serif)" }}>
                                        <span className="animate-number-pop">{item.step}</span>
                                    </div>
                                    <h3 className="text-base sm:text-lg md:text-xl font-serif text-[#3D322D] mb-2 group-hover:text-[#C47353] transition-colors duration-300">{item.title}</h3>
                                    <p className="text-sm text-[#8C7B6E]">{item.desc}</p>
                                    <div
                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-transparent via-[#C47353] to-transparent group-hover:w-full transition-all duration-500 rounded-full" />
                                </div>
                            </ScrollReveal>
                        )}
                    </div>
                    <ScrollReveal className="text-center mt-12" delay={400}>
                        <Link
                            href="/consult"
                            className="inline-flex items-center gap-2 text-[#C47353] hover:text-[#A85D40] font-medium text-sm transition-colors duration-300">
                            开始咨询
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </ScrollReveal>
                </div>
            </section>
            {/* Promise Section */}
            <section className="py-12 sm:py-16" style={{ background: "var(--paper-dark)" }}>
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
                        {[{
                            icon: <Users className="w-6 h-6" />,
                            value: 5000,
                            suffix: "+",
                            label: "服务用户",
                            format: "comma-plus"
                        }, {
                            icon: <Shield className="w-6 h-6" />,
                            value: 91,
                            suffix: "%",
                            label: "转介绍率",
                            format: "percent"
                        }, {
                            icon: <Clock3 className="w-6 h-6" />,
                            value: 180,
                            suffix: "秒",
                            label: "极速响应",
                            format: "seconds"
                        }, {
                            icon: <TrendingUp className="w-6 h-6" />,
                            value: 24,
                            suffix: "H",
                            label: "律师在线",
                            format: "hours"
                        }].map(
                            (stat, index) => <ScrollReveal key={index} delay={index * 100} direction="up">
                                <div className="text-center group">
                                    <div
                                        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/60 backdrop-blur-sm mb-3 group-hover:scale-110 group-hover:bg-[#FAF7F2]/80 transition-all duration-300 shadow-lg">
                                        <div className="text-[#C47353] group-hover:text-[#A85D40] transition-colors">
                                            {stat.icon}
                                        </div>
                                    </div>
                                    <div className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#3D322D] mb-1">
                                        <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                                    </div>
                                    <div className="text-sm sm:text-base text-[#8C7B6E]">{stat.label}</div>
                                </div>
                            </ScrollReveal>
                        )}
                    </div>
                </div>
            </section>
            {/* Guardian CTA Section */}
            <section className="py-12 sm:py-16" style={{ background: "linear-gradient(to bottom, var(--paper-dark), white)" }}>
                <div className="container mx-auto px-4">
                    <ScrollReveal className="max-w-4xl mx-auto">
                        <div className="rounded-2xl shadow-xl p-6 sm:p-8 md:p-12 text-white relative overflow-hidden" style={{ background: "linear-gradient(to bottom right, var(--terracotta), var(--terracotta-dark))" }}>
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 animate-breathe" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2 animate-breathe" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                                    <div className="flex-shrink-0">
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                            <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-xl sm:text-2xl md:text-3xl font-serif mb-3">成为守护者，保护你最爱的人</h3>
                                        <p className="text-[#FAF7F2] text-sm sm:text-base md:text-lg leading-relaxed mb-4">将专属的守护二维码发给你要守护的人，成功绑定并享受法律服务，你可获得守护专属回报 <span className="font-medium text-[#D4957A]">100%</span>激励。即使不在身边，也能把TA守护！</p>
                                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs sm:text-sm"><span className="text-[#D4957A]">✓</span> 零门槛加入</span>
                                            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs sm:text-sm"><span className="text-[#D4957A]">✓</span> 审核后发放</span>
                                            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs sm:text-sm"><span className="text-[#D4957A]">✓</span> 随时提现</span>
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
                                            className="w-full sm:w-auto bg-white text-[#C47353] hover:bg-[#FAF7F2] rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 sm:hover:scale-105 ripple-effect">立即加入 <ArrowRight className="ml-2 h-5 w-5" /></Button>
                                        <p className="text-center text-[#FAF7F2]/80 text-xs mt-2">已有守护者中心 →</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </section>
            {/* Warning Section */}
            <section className="py-12 sm:py-16" style={{ background: "linear-gradient(to bottom, var(--paper), white)" }}>
                <ScrollReveal className="text-center mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#3D322D] mb-4">重要提醒</h2>
                    <div
                        className="w-20 h-1 mx-auto rounded-full"
                        style={{ background: "linear-gradient(to right, var(--terracotta), var(--terracotta-dark))" }} />
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
