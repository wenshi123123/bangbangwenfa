'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Users, TrendingUp, CheckCircle, Sparkles, ArrowRight, ArrowLeft, ChevronDown, Smartphone, WalletCards } from 'lucide-react';

interface LawyerPromoSectionProps {
  applyHref: string;
}

// 背景漂浮圆点组件
function FloatingDots() {
  const [dots, setDots] = useState<Array<{ id: number; left: number; delay: number; size: number }>>([]);

  useEffect(() => {
    const generatedDots = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      size: Math.random() * 6 + 4
    }));
    setDots(generatedDots);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute rounded-full bg-green-200/40 animate-float-dot"
          style={{
            left: `${dot.left}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            animationDelay: `${dot.delay}s`,
            animationDuration: `${10 + dot.delay}s`
          }}
        />
      ))}
    </div>
  );
}

// 滚动进度指示器
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentProgress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
      setProgress(currentProgress);
      setShowHint(currentProgress < 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* 滚动提示箭头 */}
      {showHint && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce-slow">
          <div className="flex flex-col items-center gap-1 text-green-500/70">
            <span className="text-xs font-medium">向下滚动</span>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      )}
      
      {/* 进度指示器 */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-2">
        {[0, 33, 66, 100].map((point) => (
          <div
            key={point}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              progress >= point ? 'bg-green-500 scale-125' : 'bg-green-200'
            }`}
          />
        ))}
      </div>
    </>
  );
}

export function LawyerPromoSection({ applyHref }: LawyerPromoSectionProps) {
  return (
    <div className="lawyer-onboarding-theme">
      {/* 背景漂浮圆点 */}
      <FloatingDots />
      
      {/* 滚动进度指示器 */}
      <ScrollProgress />
      
      {/* 宣传内容区 */}
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FAF7F2 0%, #FFFFFF 100%)' }}>
        
        {/* 顶部导航栏 */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-green-100/50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* 返回首页按钮 */}
              <Link
                href="/"
                className="flex items-center gap-1.5 sm:gap-2 text-green-600 hover:text-green-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base font-medium hidden sm:inline">返回首页</span>
              </Link>
              
              {/* Logo */}
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-semibold text-green-600">律师入驻</span>
              </div>
              
              {/* Placeholder */}
              <div className="w-16 sm:w-24" />
            </div>
          </div>
        </div>

        {/* 第一模块：痛点戳中 */}
        <section className="py-12 sm:py-16 md:py-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* 模块标题 */}
              <div className="text-center mb-8 sm:mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 animate-title-float">
                  案源焦虑，是每个律师绕不开的坎
                </h2>
              </div>

              {/* 痛点内容 */}
              <div className="space-y-4 sm:space-y-6">
                {[
                  {
                    icon: <TrendingUp className="h-6 w-6 text-[#C47353]" aria-hidden="true" />,
                    text: '其他平台线索质量差、标的额小，免费咨询耗光精力，你能转化为真正的收益？'
                  },
                  {
                    icon: <Smartphone className="h-6 w-6 text-[#C47353]" aria-hidden="true" />,
                    text: '做自媒体，用户凭什么不选几十万粉丝的大博主，偏偏选择刚起号的你？'
                  },
                  {
                    icon: <WalletCards className="h-6 w-6 text-[#C47353]" aria-hidden="true" />,
                    text: '律师费被律所高额抽成，社保还要自己全额缴纳，收入不稳定，律师梦该如何继续？'
                  }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="bg-white rounded-2xl p-4 sm:p-6 border border-red-100 shadow-lg hover:shadow-xl hover:-translate-y-1 hover:border-red-200 transition-all duration-300 animate-fade-in-up group"
                    style={{ animationDelay: `${0.2 + index * 0.15}s` }}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#F5EDE5] animate-icon-bounce group-hover:scale-110">{item.icon}</div>
                      <p className="text-sm sm:text-base md:text-lg text-foreground leading-relaxed pt-1">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 第二模块：平台理念 */}
        <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-white to-green-50/50 relative overflow-hidden">
          {/* 装饰性背景 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-100/30 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* 标题 */}
              <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-8">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">帮帮问法 · 平台理念</span>
                </div>
              </div>

              {/* Logo 区域 */}
              <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.65s' }}>
                <div className="inline-flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-orange-100 to-orange-50 shadow-lg overflow-hidden flex items-center justify-center animate-title-float">
                      <img 
                        src="/logo-bangbang.png" 
                        alt="帮帮问法Logo" 
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-orange-500 tracking-wide">帮帮问法</span>
                </div>
              </div>

              {/* 核心理念 */}
              <div className="space-y-6 sm:space-y-8">
                <h3 
                  className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground animate-fade-in-up animate-title-float"
                  style={{ animationDelay: '0.7s' }}
                >
                  以人为本
                </h3>
                <p 
                  className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto animate-fade-in-up"
                  style={{ animationDelay: '0.8s' }}
                >
                  在 AI 时代的浮躁与喧嚣中，<br className="hidden sm:block" />
                  回归人与人之间交流的本质
                </p>
                <div 
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl px-6 py-4 border border-green-100 animate-fade-in-up"
                  style={{ animationDelay: '0.9s' }}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm sm:text-base text-foreground font-medium">
                    我们不做 AI 泛答的工具，<br className="hidden sm:block" />
                    只做律师与当事人之间的真实桥梁
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 第三模块：核心优势 */}
        <section className="py-12 sm:py-16 md:py-20 bg-white relative overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* 标题 */}
              <div className="text-center mb-8 sm:mb-12 animate-fade-in-up" style={{ animationDelay: '1s' }}>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-4">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">帮帮问法 · 平台核心优势</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                  专为律师打造的入驻理由
                </h2>
              </div>

              {/* 优势卡片 */}
              <div className="grid gap-4 sm:gap-6">
                {[
                  {
                    icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />,
                    title: '无需律师自行营销',
                    desc: '把本该钻研案件的精力，从推广、引流中解放出来',
                    color: 'green'
                  },
                  {
                    icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6" />,
                    title: '真实资质背书',
                    desc: '你只需向平台证明「真实律师、真实学历、真实专业」，平台为你背书',
                    color: 'blue'
                  },
                  {
                    icon: <Users className="w-5 h-5 sm:w-6 sm:h-6" />,
                    title: '稳定案源供给',
                    desc: '平台为你匹配精准需求，成为你稳定的收入来源，实现专业价值',
                    color: 'emerald'
                  },
                  {
                    icon: <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
                    title: '正规透明保障',
                    desc: '非网推所、非法律咨询公司、非不正规机构，全程公开透明，合规可靠',
                    color: 'teal'
                  }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="group bg-gradient-to-r from-green-50/80 to-white rounded-2xl p-4 sm:p-6 border border-green-100 hover:border-green-200 hover:shadow-lg transition-all duration-500"
                    style={{
                      animation: `fadeInUp 0.8s ease-out forwards ${1.1 + index * 0.1}s, cardFloat${index} 3s ease-in-out infinite ${1.1 + index * 0.1 + 0.8}s`
                    }}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`
                        w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110
                        ${item.color === 'green' ? 'bg-gradient-to-br from-green-400 to-green-500 text-white' : ''}
                        ${item.color === 'blue' ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' : ''}
                        ${item.color === 'emerald' ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white' : ''}
                        ${item.color === 'teal' ? 'bg-gradient-to-br from-teal-400 to-teal-500 text-white' : ''}
                      `}>
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base sm:text-lg text-foreground mb-1 group-hover:text-green-600 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                      <div className="flex-shrink-0 w-6 h-6 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 引导按钮 */}
              <div className="text-center mt-10 sm:mt-12 animate-fade-in-up" style={{ animationDelay: '1.6s' }}>
                <Link
                  href={applyHref}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <span className="text-lg">立即申请入驻</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <p className="mt-4 text-sm text-muted-foreground">
                  填写入驻信息，开启律师新篇章
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 全局动画样式 */}
        <style jsx global>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          
          @keyframes titleFloat {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-5px);
            }
          }
          
          @keyframes iconBounce {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }
          
          @keyframes floatDot {
            0% {
              transform: translateY(100vh) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 0.6;
            }
            90% {
              opacity: 0.6;
            }
            100% {
              transform: translateY(-10vh) rotate(360deg);
              opacity: 0;
            }
          }
          
          @keyframes bounceSlow {
            0%, 100% {
              transform: translateX(-50%) translateY(0);
            }
            50% {
              transform: translateX(-50%) translateY(-10px);
            }
          }
          
          .animate-fade-in-up {
            animation: fadeInUp 0.8s ease-out forwards;
            opacity: 0;
          }
          
          .animate-title-float {
            animation: titleFloat 3s ease-in-out infinite;
          }
          
          .animate-icon-bounce {
            animation: iconBounce 2s ease-in-out infinite;
          }
          
          .animate-float-dot {
            animation: floatDot 15s linear infinite;
          }
          
          .animate-bounce-slow {
            animation: bounceSlow 2s ease-in-out infinite;
          }
          
          @keyframes cardFloat0 {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          
          @keyframes cardFloat1 {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          
          @keyframes cardFloat2 {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          
          @keyframes cardFloat3 {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          
          @media (prefers-reduced-motion: reduce) {
            .animate-fade-in-up,
            .animate-title-float,
            .animate-icon-bounce,
            .animate-float-dot,
            .animate-bounce-slow {
              animation: none;
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
