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
import {
    getAboutUrl,
    getCivilUrl,
    getConsultUrl,
    getGuardianCenterUrl,
    getLawyerJoinUrl,
} from "@/lib/site";

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
            className={`absolute text-[#C47353]/20 pointer-events-none ${className || ""}`}
            style={style}>
            {icon}
        </div>
    );
}

function AuthoritySection() {
    const endorsements = [{
        badge: "司法认证",
        icon: <Award className="w-5 h-5 sm:w-6 sm:h-6" />,
        title: "持证律师团队",
        desc: "所有律师均持有中国律师执业证",
        gradient: "from-[#F5EDE5] to-[#D4957A]",
        light: "bg-[#FAF7F2]",
        tag: "bg-[#FAF7F2] text-[#A85D40]"
    }, {
        badge: "官方备案",
        icon: <FileCheck className="w-5 h-5 sm:w-6 sm:h-6" />,
        title: "正规法律平台",
        desc: "已合法ICP备案的法律科技平台",
        gradient: "from-[#D4957A] to-[#C47353]",
        light: "bg-[#FAF7F2]",
        tag: "bg-[#FAF7F2] text-[#A85D40]"
    }, {
        badge: "隐私保护",
        icon: <Lock className="w-5 h-5 sm:w-6 sm:h-6" />,
        title: "信息安全加密",
        desc: "采用银行级加密技术保护您的隐私",
        gradient: "from-[#C47353] to-[#A85D40]",
        light: "bg-[#FAF7F2]",
        tag: "bg-[#FAF7F2] text-[#A85D40]"
    }];

    return (
        <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden">
            <div
                className="absolute inset-0 bg-[#F9FAFB]" />
            <div
                className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div
                    className="absolute top-20 left-10 w-64 h-64 bg-[#C47353]/[0.04] rounded-full blur-3xl animate-breathe" />
                <div
                    className="absolute bottom-20 right-10 w-48 h-48 bg-[#D4957A]/[0.05] rounded-full blur-3xl animate-breathe" />
            </div>
            <div className="container mx-auto px-4 relative z-10">
                <ScrollReveal className="text-center mb-8 sm:mb-12">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#3D322D] mb-4">选择帮帮问法的理由</h2>
                    <p className="text-sm sm:text-base text-[#8C7B6E] max-w-2xl mx-auto px-4">专业、可信赖的法律咨询服务平台</p>
                </ScrollReveal>
                <div className="max-w-5xl mx-auto">
                    <div
                        className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-100 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-5">
                            <div
                                className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[#D4957A] to-[#A85D40] rounded-full -translate-y-1/2 translate-x-1/3" />
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
                        <ScrollReveal delay={500} direction="up">
                            <div className="mt-8 pt-6 border-t border-gray-100">
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
        <section className="py-20 px-6 max-w-[1100px] mx-auto">
            <div className="container mx-auto px-4">
                <ScrollReveal className="text-center mb-3">
                    <p className="font-sans text-[11px] tracking-[0.12em] uppercase text-[#8C7B6E]">FAQ</p>
                </ScrollReveal>
                <ScrollReveal className="text-center mb-2">
                    <h2 className="font-serif text-[clamp(1.5rem,4vw,2.2rem)] font-normal text-[#3D322D] leading-[1.3]">还有疑问？</h2>
                </ScrollReveal>
                <ScrollReveal className="text-center mb-14">
                    <p className="font-sans text-[15px] text-[#8C7B6E] leading-[1.6]">关于咨询流程、收费、隐私的常见问题</p>
                </ScrollReveal>

                <ScrollReveal className="flex items-center justify-center gap-2 mb-12">
                    <span className="block w-6 h-[0.5px] bg-[rgba(196,115,83,0.2)]"></span>
                    <span className="block w-[6px] h-[6px] bg-[#C47353] rotate-45 opacity-60"></span>
                    <span className="block w-6 h-[0.5px] bg-[rgba(196,115,83,0.2)]"></span>
                </ScrollReveal>

                <div className="max-w-[720px] mx-auto">
                    {faqs.map((faq, index) => (
                        <ScrollReveal key={index} delay={index * 80} direction="up">
                            <div className={"border-t border-[rgba(196,115,83,0.2)] py-5" + (index === faqs.length - 1 ? " border-b" : "")}>
                                <button
                                    onClick={() => toggleFAQ(index)}
                                    className="w-full flex items-start gap-3 text-left focus:outline-none cursor-pointer select-none"
                                    aria-expanded={openIndex === index}
                                >
                                    <span className="w-[6px] h-[6px] min-w-[6px] bg-[#C47353] rounded-full mt-[7px] opacity-70"></span>
                                    <h3 className="font-sans text-[15px] font-medium text-[#3D322D] flex-1 leading-[1.5]">{faq.q}</h3>
                                    <span className={"text-[14px] text-[#B4A99A] mt-0.5 transition-transform duration-250 " + (openIndex === index ? "rotate-90" : "")}>›</span>
                                </button>
                                <div className={`overflow-hidden transition-all duration-400 ease-out ${openIndex === index ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                                    <p className="font-sans text-[14px] text-[#8C7B6E] leading-[1.8] pt-3 pb-1 pl-[18px]">{faq.a}</p>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                    <ScrollReveal className="text-center mt-10">
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="font-sans text-[14px] text-[#C47353] border-b border-[rgba(196,115,83,0.2)] pb-0.5 hover:text-[#A85D40] hover:border-[#C47353] transition-colors bg-transparent cursor-pointer"
                        >
                            还有更多问题？直接问律师 →
                        </button>
                    </ScrollReveal>
                </div>
            </div>
        </section>
    );
}






const heroImages = [
    {
        src: "/hero-photo-1.jpg",
        alt: "律师在夜晚办公室整理案件材料",
        title: "深夜案卷整理",
        subtitle: "一份材料背后，是对事实与证据的反复核对。",
    },
    {
        src: "/hero-photo-2.jpg",
        alt: "律师在咖啡馆与当事人沟通",
        title: "面对面沟通",
        subtitle: "把复杂问题说清楚，把下一步行动讲明白。",
    },
    {
        src: "/hero-photo-3.jpg",
        alt: "律师在办公室进行法律咨询",
        title: "专业法律咨询",
        subtitle: "围绕争议焦点，快速找到可执行的解决路径。",
    },
    {
        src: "/hero-photo-4.jpg",
        alt: "律师在会议室与当事人沟通案件",
        title: "正式会谈",
        subtitle: "在安静、专业的环境里，逐条梳理问题。",
    },
    {
        src: "/hero-photo-5.jpg",
        alt: "法官与当事人沟通的办公场景",
        title: "权威场景",
        subtitle: "用更可信赖的场景，呈现法律服务的专业感。",
    },
];

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const [currentImage, setCurrentImage] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 返回首页时保持滚动位置
    useEffect(() => {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'auto';
        }
    }, []);

    useEffect(() => {
        if (paused) return;
        const timer = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % heroImages.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [paused]);

    return (
        <div className="min-h-screen">
            <section className="relative overflow-hidden bg-[#FAF7F2]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#C47353]/[0.03] via-[#D4957A]/[0.02] to-transparent" />
                <div className="absolute top-20 left-10 w-72 h-72 bg-[#C47353]/[0.04] rounded-full blur-3xl animate-breathe" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#D4957A]/[0.03] rounded-full blur-3xl animate-breathe" style={{ animationDelay: "1s" }} />
                <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-[80px] sm:pt-[120px] md:pt-[140px] pb-16 sm:pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                        {/* 左侧内容 */}
                        <div className="hero-content text-center md:text-left">
                            <h1 className="font-serif text-[clamp(2rem,6vw,3.8rem)] font-normal text-[#3D322D] leading-[1.25] mb-6">
                                AI千问
                                <br />不如<span className="text-[#C47353]">律师一言</span>
                            </h1>
                            <p className="font-sans text-[15px] text-[#8C7B6E] leading-[1.9] mb-4">
                                AI 很好，但承担不了责任。<br />
                                AI 的答案错了，它随时可以更改。<br />
                                你按照错的答案去做了，你一辈子无法撤回。
                            </p>
                            {/* Slogan 承诺 */}
                            <p className="font-sans text-[13px] text-[#C47353] leading-[1.8] mb-4">
                                <span className="font-medium">180秒</span>极速应答 ·
                                超<span className="font-medium">30分钟</span>费用减半 ·
                                超<span className="font-medium">3小时</span>费用全免
                            </p>
                            <div className="flex gap-3.5 flex-wrap justify-center md:justify-start">
                                <Button
                                    asChild
                                    className="h-12 bg-[#C47353] hover:bg-[#A85D40] text-white font-sans text-[14px] font-medium rounded-full px-9 tracking-[0.02em] shadow-md transition-all"
                                >
                                    <Link prefetch={false} href={getCivilUrl()}>民事咨询 <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="h-12 border-[#C47353] text-[#C47353] hover:bg-[#C47353] hover:text-white font-sans text-[14px] font-medium rounded-full px-9 tracking-[0.02em]"
                                >
                                    <Link prefetch={false} href={getConsultUrl()}>刑事咨询 <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                                </Button>
                            </div>
                        </div>

                        {/* 右侧轮播图 */}
                        <div className="hero-carousel relative">
                            <div
                                className="relative overflow-hidden rounded-2xl bg-[#F5EDE5] shadow-[0_8px_32px_rgba(61,50,45,0.12)]"
                                style={{ aspectRatio: "600/750", maxHeight: "650px" }}
                                onMouseEnter={() => setPaused(true)}
                                onMouseLeave={() => setPaused(false)}
                            >
                                <div className="relative w-full h-full">
                                    {heroImages.map((img, i) => (
                                        <div
                                            key={img.src}
                                            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-[800ms] ease-in-out ${
                                                currentImage === i ? "opacity-100 z-10" : "opacity-0 z-0"
                                            }`}
                                        >
                                            <Image
                                                src={img.src}
                                                alt={img.alt}
                                                fill
                                                priority={i === 0}
                                                quality={72}
                                                sizes="(min-width: 768px) 50vw, 100vw"
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#3D322D]/70 via-[#3D322D]/12 to-transparent" />
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#C47353]/12 via-transparent to-[#D4957A]/10" />
                                            <div className="absolute left-5 right-5 bottom-24 sm:bottom-28 text-white">
                                                <div className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1 text-[11px] sm:text-xs tracking-[0.12em] uppercase">
                                                    真实图片 {String(i + 1).padStart(2, "0")}
                                                </div>
                                                <div className="mt-3 font-serif text-[1.6rem] sm:text-[1.9rem] md:text-[2.1rem] leading-tight font-medium drop-shadow-sm">
                                                    {img.title}
                                                </div>
                                                <p className="mt-2 max-w-[26rem] text-sm sm:text-[15px] text-white/88 leading-relaxed drop-shadow-sm">
                                                    {img.subtitle}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute top-4 left-4 z-20">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1.5 text-[11px] sm:text-xs text-white">
                                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                                        首页真实场景图集
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-center gap-2 sm:gap-2.5 overflow-x-auto">
                                    {heroImages.map((img, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { setCurrentImage(i); setPaused(true); }}
                                            className={`relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden rounded-xl border transition-all duration-300 ${
                                                currentImage === i
                                                    ? "border-white shadow-[0_0_0_2px_rgba(196,115,83,0.35)] scale-105"
                                                    : "border-white/30 opacity-75 hover:opacity-100"
                                            }`}
                                            aria-label={`切换到第 ${i + 1} 张图片`}
                                        >
                                            <Image
                                                src={img.src}
                                                alt={img.alt}
                                                fill
                                                quality={50}
                                                sizes="64px"
                                                className="object-cover"
                                            />
                                            <div className={`absolute inset-0 transition-colors ${
                                                currentImage === i ? "bg-[#C47353]/15" : "bg-black/15"
                                            }`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Steps Section - redesign to match Demo HTML */}
            <section className="py-20 px-6 max-w-[1100px] mx-auto">
                <div className="container mx-auto">
                    <ScrollReveal className="text-center mb-3">
                        <p className="font-sans text-[11px] tracking-[0.12em] uppercase text-[#8C7B6E]">How It Works</p>
                    </ScrollReveal>
                    <ScrollReveal className="text-center mb-2">
                        <h2 className="font-serif text-[clamp(1.5rem,4vw,2.2rem)] font-normal text-[#3D322D] leading-[1.3]">四步，找到对的人</h2>
                    </ScrollReveal>
                    <ScrollReveal className="text-center mb-14">
                        <p className="font-sans text-[15px] text-[#8C7B6E] leading-[1.6]">简单四步，快速对接专业律师</p>
                    </ScrollReveal>

                    <ScrollReveal className="flex items-center justify-center gap-2 mb-12">
                        <span className="block w-6 h-[0.5px] bg-[rgba(196,115,83,0.2)]"></span>
                        <span className="block w-[6px] h-[6px] bg-[#C47353] rotate-45 opacity-60"></span>
                        <span className="block w-6 h-[0.5px] bg-[rgba(196,115,83,0.2)]"></span>
                    </ScrollReveal>

                    <div className="grid grid-cols-2 md:grid-cols-4 max-w-5xl mx-auto">
                        {[{
                            num: "一",
                            title: "选咨询类型",
                            desc: "民事、刑事、商事，一键选择"
                        }, {
                            num: "二",
                            title: "描述你的问题",
                            desc: "文字、语音、图片，自由描述"
                        }, {
                            num: "三",
                            title: "智能匹配律师",
                            desc: "查看资质、评分，自主匹配"
                        }, {
                            num: "四",
                            title: "完成支付",
                            desc: "安全支付，即刻开始咨询"
                        }].map(
                            (item, index) => <ScrollReveal key={item.num} delay={index * 100} direction="up">
                                <div
                                    className="text-center px-5 py-8 border-l-0 md:border-l border-[rgba(196,115,83,0.2)] first:border-none cursor-default transition-[background,transform] duration-250 hover:bg-[rgba(196,115,83,0.04)] hover:-translate-y-1">
                                    <div className="font-serif text-[28px] font-normal text-[#C47353] opacity-35 leading-none mb-4">{item.num}</div>
                                    <h3 className="font-serif text-[1.05rem] font-normal text-[#3D322D] mb-2.5 leading-[1.4] hover:text-[#C47353] transition-colors duration-250">{item.title}</h3>
                                    <p className="font-sans text-[13px] text-[#8C7B6E] leading-[1.6]">{item.desc}</p>
                                    {index < 3 && <div className="hidden md:block absolute top-1/2 right-[-14px] -translate-y-1/2 text-[16px] text-[#C47353] opacity-35 z-1">›</div>}
                                </div>
                            </ScrollReveal>
                        )}
                    </div>
                    <ScrollReveal className="text-center mt-12" delay={400}>
                        <Link
                            prefetch={false}
                            href={getConsultUrl()}
                            className="inline-flex items-center gap-2 font-sans text-[14px] text-[#C47353] no-underline border-b border-[rgba(196,115,83,0.2)] pb-0.5 hover:text-[#A85D40] hover:border-[#C47353] transition-colors">
                            开始咨询 <ArrowRight className="w-4 h-4" />
                        </Link>
                    </ScrollReveal>
                </div>
            </section>
            {/* Promise Section - our promise data */}
            <section className="pt-[60px] pb-20 px-6 bg-[#F5EDE5]">
                <div className="container mx-auto max-w-[1100px]">
                    <ScrollReveal className="text-center mb-3">
                        <p className="font-sans text-[11px] tracking-[0.12em] uppercase text-[#8C7B6E]">Our Promise</p>
                    </ScrollReveal>
                    <ScrollReveal className="text-center mb-2">
                        <h2 className="font-serif text-[clamp(1.5rem,4vw,2.2rem)] font-normal text-[#3D322D] leading-[1.3]">我们的承诺</h2>
                    </ScrollReveal>
                    <ScrollReveal className="text-center mb-14">
                        <p className="font-sans text-[15px] text-[#8C7B6E] leading-[1.6]">每一次咨询，都承载着一个真实的信任</p>
                    </ScrollReveal>

                    <ScrollReveal className="flex items-center justify-center gap-2 mb-12">
                        <span className="block w-6 h-[0.5px] bg-[rgba(196,115,83,0.2)]"></span>
                        <span className="block w-[6px] h-[6px] bg-[#C47353] rotate-45 opacity-60"></span>
                        <span className="block w-6 h-[0.5px] bg-[rgba(196,115,83,0.2)]"></span>
                    </ScrollReveal>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14 max-w-4xl mx-auto">
                        {[{
                            target: 5000,
                            format: "comma-plus",
                            display: "5,000+",
                            label: "服务用户"
                        }, {
                            target: 91,
                            format: "percent",
                            display: "91%",
                            label: "转介绍率"
                        }, {
                            target: 180,
                            format: "seconds",
                            display: "180秒",
                            label: "极速响应"
                        }, {
                            target: 24,
                            format: "hours",
                            display: "24H",
                            label: "律师在线"
                        }].map(
                            (stat, index) => <ScrollReveal key={index} delay={index * 100} direction="up">
                                <div className="text-center px-4 py-8 border-l-0 md:border-l border-[rgba(196,115,83,0.2)] first:border-none">
                                    <div className="font-serif text-[clamp(2rem,5vw,3rem)] font-normal text-[#3D322D] leading-[1.1] mb-2 tabular-nums">
                                        <AnimatedNumber target={stat.target} suffix={stat.format === "percent" ? "%" : stat.format === "seconds" ? "秒" : stat.format === "hours" ? "H" : "+"} />
                                    </div>
                                    <div className="font-sans text-[13px] text-[#8C7B6E] leading-[1.5]">{stat.label}</div>
                                </div>
                            </ScrollReveal>
                        )}
                    </div>

                    <ScrollReveal className="flex justify-center gap-6 flex-wrap">
                        <Link prefetch={false} href={getAboutUrl()} className="inline-flex items-center gap-1.5 font-sans text-[14px] text-[#C47353] no-underline border-b border-[rgba(196,115,83,0.2)] pb-0.5 hover:text-[#A85D40] hover:border-[#C47353] transition-colors">了解帮帮 →</Link>
                        <Link prefetch={false} href={getLawyerJoinUrl()} className="inline-flex items-center gap-1.5 font-sans text-[14px] text-[#C47353] no-underline border-b border-[rgba(196,115,83,0.2)] pb-0.5 hover:text-[#A85D40] hover:border-[#C47353] transition-colors">律师入驻 →</Link>
                    </ScrollReveal>
                </div>
            </section>
            {/* Guardian Section - redesign to match Demo HTML */}
            <section className="py-20 px-6 max-w-full bg-[#FAF7F2]">
                <div className="max-w-[860px] mx-auto">
                    <ScrollReveal className="text-center py-20 px-12 border border-[rgba(196,115,83,0.2)] rounded-xl bg-[rgba(250,247,242,0.6)]">
                        <p className="font-sans text-[11px] tracking-[0.12em] uppercase text-[#8C7B6E] mb-3">Referral Program</p>
                        <h3 className="font-serif text-[clamp(1.3rem,3.5vw,1.8rem)] font-normal text-[#3D322D] mb-4 leading-[1.4]">守护你爱的人<br />从一次专业咨询开始</h3>
                        <p className="font-sans text-[14px] text-[#8C7B6E] leading-[1.8] mb-6">
                            将专属的守护二维码发给你要守护的人。<br />
                            他/她成功完成首次咨询后，你可获得 <strong className="text-[#C47353]">100%</strong> 激励。
                        </p>
                        <div className="font-serif text-[1.1rem] text-[#C47353] font-medium mb-7">即使不在身边，也能把 TA 守护</div>

                        <Button
                            size="lg"
                            onClick={() => {
                                const savedUser = localStorage.getItem("user_info");
                                if (savedUser) {
                                    window.location.href = getGuardianCenterUrl();
                                } else {
                                    window.dispatchEvent(new CustomEvent("open-login-modal"));
                                }
                            }}
                            className="bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full px-10 py-3 font-serif tracking-wide shadow-[0_2px_12px_rgba(196,115,83,0.3)] hover:-translate-y-[1px] transition-all duration-200"
                        >立即成为守护者</Button>

                        <div className="flex items-baseline justify-center gap-2 mt-7 mb-4 opacity-70">
                            <span className="font-serif text-[1.8rem] text-[#C47353] font-normal leading-none">500+</span>
                            <span className="font-sans text-[13px] text-[#8C7B6E]">守护者已加入</span>
                        </div>

                        <div className="flex justify-center gap-5 mt-6 flex-wrap">
                            <span className="font-sans text-[12px] text-[#B4A99A] flex items-center gap-1.5"><span className="inline-block w-1 h-1 bg-[#C47353] rounded-full opacity-60"></span>零门槛加入</span>
                            <span className="font-sans text-[12px] text-[#B4A99A] flex items-center gap-1.5"><span className="inline-block w-1 h-1 bg-[#C47353] rounded-full opacity-60"></span>审核后发放</span>
                            <span className="font-sans text-[12px] text-[#B4A99A] flex items-center gap-1.5"><span className="inline-block w-1 h-1 bg-[#C47353] rounded-full opacity-60"></span>随时提现</span>
                        </div>

                        <p className="font-sans text-[12px] text-[#B4A99A] mt-5">
                            已是守护者？<Link prefetch={false} href={getGuardianCenterUrl()} className="text-[#C47353] no-underline border-b border-[rgba(196,115,83,0.2)]">进入守护者中心 →</Link>
                        </p>
                    </ScrollReveal>
                </div>
            </section>

            {/* Warning Section - redesign to match Demo HTML */}
            <section className="py-20 max-w-full px-0 bg-[#F5EDE5]">
                <div className="max-w-[800px] mx-auto px-6">
                    <ScrollReveal className="text-center mb-3">
                        <p className="font-sans text-[11px] tracking-[0.12em] uppercase text-[#8C7B6E]">Legal Notice</p>
                    </ScrollReveal>
                    <ScrollReveal className="text-center mb-2">
                        <h2 className="font-serif text-[clamp(1.5rem,4vw,2.2rem)] font-normal text-[#3D322D] leading-[1.3]">重要法律提醒</h2>
                    </ScrollReveal>
                    <ScrollReveal className="text-center mb-14">
                        <p className="font-sans text-[15px] text-[#8C7B6E] leading-[1.6]">平台责任边界清晰，请您仔细阅读</p>
                    </ScrollReveal>

                    <ScrollReveal className="flex items-center justify-center gap-2 mb-12">
                        <span className="block w-6 h-[0.5px] bg-[rgba(196,115,83,0.2)]"></span>
                        <span className="block w-[6px] h-[6px] bg-[#C47353] rotate-45 opacity-60"></span>
                        <span className="block w-6 h-[0.5px] bg-[rgba(196,115,83,0.2)]"></span>
                    </ScrollReveal>

                    {/* Warning Card 1 */}
                    <div className="border-l-4 border-[#C47353] px-6 py-5 mb-7 bg-[rgba(250,247,242,0.7)] rounded-r-[6px]">
                        <p className="font-serif text-[13px] text-[#C47353] font-medium mb-1.5 tracking-[0.05em]">第一条</p>
                        <h3 className="font-serif text-[17px] font-normal text-[#3D322D] mb-2 leading-[1.4]">AI 提供信息，律师提供责任</h3>
                        <p className="font-sans text-[14px] text-[#8C7B6E] leading-[1.8] mb-3">AI 只能提供通用法律信息，不能替代执业律师的专业判断、个案分析和出庭代理。涉及诉讼、刑事辩护、合同签订等专业事务，请务必咨询执业律师。</p>
                    </div>

                    {/* Warning Card 2 */}
                    <div className="border-l-4 border-[#C47353] px-6 py-5 mb-7 bg-[rgba(250,247,242,0.7)] rounded-r-[6px]">
                        <p className="font-serif text-[13px] text-[#C47353] font-medium mb-1.5 tracking-[0.05em]">第二条</p>
                        <h3 className="font-serif text-[17px] font-normal text-[#3D322D] mb-2 leading-[1.4]">网络答案不可轻信</h3>
                        <p className="font-sans text-[14px] text-[#8C7B6E] leading-[1.8] mb-3">网上搜索的法律答案良莠不齐，很多已过时或不适用您的具体情况。错误适用法条可能导致诉讼时效过期、证据灭失等不可逆后果。</p>
                    </div>

                    {/* Warning Card 3 */}
                    <div className="border-l-4 border-[#C47353] px-6 py-5 mb-7 bg-[rgba(250,247,242,0.7)] rounded-r-[6px]">
                        <p className="font-serif text-[13px] text-[#C47353] font-medium mb-1.5 tracking-[0.05em]">第三条</p>
                        <h3 className="font-serif text-[17px] font-normal text-[#3D322D] mb-2 leading-[1.4]">黄金救援期不容错过</h3>
                        <p className="font-sans text-[14px] text-[#8C7B6E] leading-[1.8] mb-3">刑事案件存在黄金 37 天救援期。拘留后 37 天内是申请取保候审、不批准逮捕的关键窗口，过期后羁押率显著上升。遇到刑事问题，请立即咨询律师。</p>
                    </div>
                </div>
            </section>
            <AuthoritySection />
            <FAQSection />


            <CursorFollower />
            <ScrollProgress />
            <Footer />
        </div>
    );
}
