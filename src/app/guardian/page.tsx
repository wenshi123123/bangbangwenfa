'use client';

import { useState, useEffect, useRef } from 'react';
import NextLink from 'next/link';
import { ArrowLeft, Heart, Shield, MessageCircle, ChevronDown, Sparkles, ChevronRight, Gift, Star, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Link = NextLink;

// 修复后的动画 hook - 支持重复触发
function useScrollAnimation(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [key, setKey] = useState(0);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 每次进入视口都重新触发动画
          setKey(prev => prev + 1);
          setIsVisible(true);
        }
      },
      { threshold: 0.15, ...options }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return { ref, isVisible, animationKey: key };
}

// 首屏主题区 - 不需要滚动触发
function HeroSection({ onStartJoin }: { onStartJoin: () => void }) {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    // 页面加载后延迟触发动画
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col bg-gradient-to-b from-rose-50 via-orange-50 to-white overflow-hidden">
      {/* 温暖的装饰背景 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-rose-200/40 rounded-full blur-3xl animate-gentle-float" />
        <div className="absolute top-1/4 -right-20 w-80 h-80 bg-orange-200/40 rounded-full blur-3xl animate-gentle-float animation-delay-200" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-amber-100/50 rounded-full blur-3xl animate-gentle-float animation-delay-400" />
      </div>
      
      {/* 顶部导航 - 玫瑰色主题 */}
      <div className={`sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-rose-200/50 transition-all duration-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-rose-600 hover:text-rose-700 transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">返回首页</span>
            </Link>
            <span className="text-sm font-semibold text-rose-600 flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-white animate-warm-pulse" />
              </div>
              守护者计划
            </span>
            <div className="w-20" />
          </div>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* 装饰图标 */}
          <div className={`mb-8 transition-all duration-700 delay-200 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full shadow-xl shadow-rose-200/50 animate-warm-pulse">
              <Heart className="w-10 h-10 text-white" />
            </div>
          </div>
          
          {/* 主标题 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            <span className="inline-block transition-all duration-700 delay-300" style={{ transform: loaded ? 'translateY(0)' : 'translateY(20px)' }}>
              守护，
            </span>
            <span className="inline-block text-rose-500 transition-all duration-700 delay-400" style={{ transform: loaded ? 'translateY(0)' : 'translateY(20px)' }}>
              是给在乎的人
            </span>
            <br className="hidden sm:block" />
            <span className="inline-block transition-all duration-700 delay-500" style={{ transform: loaded ? 'translateY(0)' : 'translateY(20px)' }}>
              最好的礼物
            </span>
          </h1>
          
          {/* 副标题 */}
          <div className={`space-y-2 mb-4 transition-all duration-700 delay-600 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-lg sm:text-xl text-muted-foreground">
              你身边有没有这样的朋友？
            </p>
            <p className="text-base sm:text-lg text-slate-600">
              遇到法律问题不知道怎么办，担心请律师太贵...
            </p>
          </div>
          
          <p className={`text-base sm:text-lg text-rose-600 font-medium mb-10 transition-all duration-700 delay-700 ${loaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            把专属守护凭证发给他，让他在需要时有所依靠
          </p>
          
          {/* CTA按钮 */}
          <div className={`transition-all duration-700 delay-800 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Button 
              onClick={onStartJoin}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-full px-10 py-6 text-lg font-semibold shadow-xl shadow-rose-200/50 transition-all duration-300 active:scale-95 sm:hover:scale-105 sm:hover:shadow-2xl sm:hover:shadow-rose-300/30 group"
            >
              <Heart className="mr-2 h-5 w-5 group-hover:animate-warm-pulse" />
              传递守护
              <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* 滚动提示 */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col items-center text-rose-400 animate-scroll-hint">
          <span className="text-sm mb-2">向下滚动</span>
          <ArrowDown className="w-5 h-5" />
        </div>
      </div>
    </section>
  );
}

// 守护场景区
function GuardianScenesSection() {
  const { ref, isVisible, animationKey } = useScrollAnimation();
  
  const scenes = [
    {
      icon: '👨‍👩‍👧',
      title: '守护家人',
      desc: '爸妈年纪大了，总担心他们被人骗。把守护凭证给他们，让帮帮问法帮我守护他们。',
      color: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-100 hover:border-blue-200'
    },
    {
      icon: '👫',
      title: '守护朋友',
      desc: '兄弟创业，怕他合同被坑。给他一份守护，让他在法律路上不孤单。',
      color: 'from-purple-50 to-violet-50',
      borderColor: 'border-purple-100 hover:border-purple-200'
    },
    {
      icon: '💑',
      title: '守护爱人',
      desc: '想给她一份长期的法律保障。守护，是我们之间的承诺。',
      color: 'from-rose-50 to-pink-50',
      borderColor: 'border-rose-100 hover:border-rose-200'
    }
  ];
  
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-24 bg-white relative">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* 标题 */}
          <div className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0 animate-once' : 'opacity-0 translate-y-8'}`} key={`title-${animationKey}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              你想守护谁？
            </h2>
            <p className="text-muted-foreground text-lg">
              每一份守护，都是爱的传递
            </p>
          </div>
          
          {/* 场景卡片 */}
          <div className="grid gap-6 sm:grid-cols-3">
            {scenes.map((scene, index) => (
              <div 
                key={index}
                className={`group relative bg-gradient-to-br ${scene.color} rounded-2xl p-6 border ${scene.borderColor} transition-all duration-500 hover:-translate-y-2 hover:shadow-xl animate-card-hover ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${0.1 + index * 0.1}s` }}
              >
                {/* 悬停光效 */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/20 group-hover:to-white/40 transition-all duration-500" />
                
                <div className="relative z-10 text-center">
                  <div className="text-6xl mb-4 transition-transform duration-500 group-hover:scale-110">
                    {scene.icon}
                  </div>
                  <h3 className="font-bold text-xl text-foreground mb-3">{scene.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    &ldquo;{scene.desc}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// 如何守护区
function HowToProtectSection() {
  const { ref, isVisible, animationKey } = useScrollAnimation();
  
  const steps = [
    { 
      num: '01', 
      title: '获取守护凭证', 
      desc: '一键生成专属守护码，简单几步即可获得',
      icon: <Shield className="w-6 h-6" />
    },
    { 
      num: '02', 
      title: '发送给在乎的人', 
      desc: '把守护凭证发给你想守护的人，让他们知道你在乎',
      icon: <Heart className="w-6 h-6" />
    },
    { 
      num: '03', 
      title: '他们获得保护', 
      desc: '他们使用凭证注册，享受帮帮问法的法律服务',
      icon: <Shield className="w-6 h-6" />
    },
    { 
      num: '04', 
      title: '你收到守护通知', 
      desc: '每当他们获得保护，你会收到温暖的提醒',
      icon: <MessageCircle className="w-6 h-6" />
    }
  ];
  
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-white to-amber-50/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* 标题 */}
          <div className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} key={`howto-title-${animationKey}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              如何传递守护？
            </h2>
            <p className="text-muted-foreground text-lg">
              简单四步，守护你爱的人
            </p>
          </div>
          
          {/* 步骤 */}
          <div className="grid gap-6 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-start gap-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
                style={{ transitionDelay: `${0.15 + index * 0.12}s` }}
              >
                {/* 数字圆圈 */}
                <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br from-rose-400 to-orange-400 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-500 hover:scale-110 hover:shadow-xl ${isVisible ? 'animate-step-bounce' : ''}`}
                  style={{ animationDelay: `${0.3 + index * 0.15}s` }}>
                  <span className="font-bold text-xl">{step.num}</span>
                </div>
                
                {/* 内容卡片 */}
                <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-rose-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-rose-200 group">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-rose-600 transition-colors">{step.title}</h3>
                    <div className="text-rose-400 group-hover:animate-warm-pulse transition-transform">{step.icon}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// 守护的意义区
function MeaningSection() {
  const { ref, isVisible, animationKey } = useScrollAnimation();
  
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 relative overflow-hidden">
      {/* 装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 right-10 text-7xl animate-gentle-float">💝</div>
        <div className="absolute bottom-10 left-10 text-5xl animate-gentle-float animation-delay-300">✨</div>
        <div className="absolute top-1/2 left-1/4 text-4xl animate-gentle-float animation-delay-500">🌟</div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} key={`meaning-${animationKey}`}>
          {/* 标签 */}
          <div className={`inline-flex items-center gap-2 bg-white/90 rounded-full px-5 py-2 mb-8 shadow-lg transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <Sparkles className="w-5 h-5 text-rose-500 animate-warm-pulse" />
            <span className="text-sm font-medium text-rose-600">意外惊喜</span>
          </div>
          
          {/* 内容 */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 transition-all duration-700 delay-200">
            守护Ta的同时
          </h2>
          
          <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground mb-4 transition-all duration-700 delay-300">
            也会获得<span className="text-rose-500 font-bold">1%</span>的永久回报返现
          </p>
          
          <p className="text-base sm:text-lg text-slate-500 transition-all duration-700 delay-400">
            这是守护的礼物，是爱的回报
          </p>
          
          {/* 礼物 */}
          <div className={`mt-10 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-3 bg-white/80 rounded-full px-6 py-3 shadow-lg">
              <Gift className="w-6 h-6 text-rose-500 animate-warm-pulse" />
              <span className="text-rose-600 font-medium">守护礼物</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// 守护者心声
function TestimonialsSection() {
  const { ref, isVisible, animationKey } = useScrollAnimation();
  
  const testimonials = [
    {
      avatar: '👨',
      name: '张先生',
      city: '北京',
      content: '把守护码发给了爸妈，让他们遇到法律问题不用慌。感觉自己在外地也安心多了。',
      rating: 5
    },
    {
      avatar: '👩',
      name: '李女士',
      city: '上海',
      content: '老公创业，我把守护凭证给他当礼物。他说这是他收到最实用的东西。',
      rating: 5
    },
    {
      avatar: '👨‍💼',
      name: '王先生',
      city: '深圳',
      content: '给女朋友注册了守护，她说感受到了我的用心。这个功能真的很暖。',
      rating: 5
    }
  ];
  
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* 标题 */}
          <div className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} key={`testi-title-${animationKey}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              守护者们说
            </h2>
            <p className="text-muted-foreground text-lg">
              每一份守护，都是爱的延续
            </p>
          </div>
          
          {/* 评价卡片 */}
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((item, index) => (
              <div 
                key={index}
                className={`group bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 border border-slate-100 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 hover:border-rose-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${0.2 + index * 0.15}s` }}
              >
                {/* 星级 */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                
                {/* 评语 */}
                <p className="text-sm sm:text-base text-slate-600 mb-5 leading-relaxed group-hover:text-slate-700 transition-colors">
                  &ldquo;{item.content}&rdquo;
                </p>
                
                {/* 用户信息 */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full flex items-center justify-center text-xl shadow-md group-hover:scale-110 transition-transform">
                    {item.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// 底部CTA
function BottomCTA({ onStartJoin }: { onStartJoin: () => void }) {
  const { ref, isVisible, animationKey } = useScrollAnimation();
  
  return (
    <section ref={ref} className="py-20 sm:py-24 md:py-28 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className={`max-w-2xl mx-auto text-center text-white transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} key={`cta-${animationKey}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5">
            现在就传递你的守护
          </h2>
          <p className="text-white/90 text-lg sm:text-xl mb-10">
            发送给在乎的人，让他们知道你在乎
          </p>
          
          <Button 
            onClick={onStartJoin}
            size="lg"
            className="w-full sm:w-auto bg-white text-rose-600 hover:bg-white/95 rounded-full px-12 py-7 text-xl font-bold shadow-2xl transition-all duration-300 active:scale-95 sm:hover:scale-105 sm:hover:shadow-white/30 group"
          >
            <Heart className="mr-3 h-6 w-6 group-hover:animate-warm-pulse" />
            立即传递守护
            <ChevronRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}

// FAQ区
function FAQSection({ onStartJoin }: { onStartJoin: () => void }) {
  const { ref, isVisible, animationKey } = useScrollAnimation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const faqs = [
    { q: '成为守护者需要付费吗？', a: '完全免费，零门槛加入。成为帮帮问法的用户后，你把守护凭证发给你想守护的人即可。' },
    { q: '守护凭证如何使用？', a: '你获得守护凭证二维码或专属链接后，发给你想守护的人。他们注册时，就能和你建立守护关系。' },
    { q: '如何知道他们获得了保护？', a: '每当他们通过你的凭证获得法律服务，你会收到温馨的通知。' },
    { q: '守护礼物是什么？', a: '当你的守护对象在本平台享受法律服务时，你会获得1%的金额返现。这是爱的回报，也是我们对你的感谢。' },
    { q: '可以同时守护多人吗？', a: '当然可以！可以守护家人、朋友、爱人，网友，甚至是陌生人，数量不受限制。' }
  ];
  
  return (
    <section ref={ref} className="py-16 sm:py-20 md:py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* 标题 */}
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10 sm:mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} key={`faq-title-${animationKey}`}>
            常见问题
          </h2>
          
          {/* FAQ列表 */}
          <div className={`space-y-3 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white transition-all duration-300 hover:border-rose-200 hover:shadow-lg"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-rose-50/50 transition-colors"
                >
                  <span className="font-medium text-sm sm:text-base text-foreground pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-all duration-300 ${openIndex === index ? 'rotate-180 text-rose-500' : ''}`} />
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-40' : 'max-h-0'}`}>
                  <div className="p-5 bg-rose-50/50 border-t border-rose-100">
                    <p className="text-sm sm:text-base text-muted-foreground">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 底部CTA */}
          <div className={`text-center mt-12 sm:mt-16 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="text-muted-foreground mb-5 text-lg">准备好了吗？</p>
            <Button 
              onClick={onStartJoin}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-full px-10 py-6 text-lg font-semibold shadow-xl shadow-rose-200/50 transition-all duration-300 active:scale-95 sm:hover:scale-105 group"
            >
              <Heart className="mr-2 h-5 w-5 group-hover:animate-warm-pulse" />
              传递守护
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// 动画样式
function AnimationStyles() {
  return (
    <style jsx global>{`
      @keyframes gentle-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(10px, -15px) scale(1.05); }
      }
      
      @keyframes warm-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.9; }
      }
      
      @keyframes scroll-hint {
        0%, 100% { transform: translateY(0); opacity: 1; }
        50% { transform: translateY(8px); opacity: 0.5; }
      }
      
      @keyframes step-bounce {
        0% { transform: scale(0.8); opacity: 0; }
        50% { transform: scale(1.1); }
        70% { transform: scale(0.95); }
        100% { transform: scale(1); opacity: 1; }
      }
      
      .animate-gentle-float {
        animation: gentle-float 6s ease-in-out infinite;
      }
      
      .animate-warm-pulse {
        animation: warm-pulse 2s ease-in-out infinite;
      }
      
      .animate-scroll-hint {
        animation: scroll-hint 2s ease-in-out infinite;
      }
      
      .animate-step-bounce {
        animation: step-bounce 0.8s ease-out forwards;
      }
      
      .animation-delay-200 {
        animation-delay: 0.2s;
      }
      
      .animation-delay-300 {
        animation-delay: 0.3s;
      }
      
      .animation-delay-400 {
        animation-delay: 0.4s;
      }
      
      .animation-delay-500 {
        animation-delay: 0.5s;
      }
      
      .animate-card-hover {
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      html {
        scroll-behavior: smooth;
      }
    `}</style>
  );
}

// 主页面
export default function GuardianPage() {
  const handleStartJoin = () => {
    window.location.href = '/guardian/center';
  };
  
  return (
    <>
      <AnimationStyles />
      <div className="min-h-screen bg-white">
        <HeroSection onStartJoin={handleStartJoin} />
        <GuardianScenesSection />
        <HowToProtectSection />
        <MeaningSection />
        <TestimonialsSection />
        <BottomCTA onStartJoin={handleStartJoin} />
        <FAQSection onStartJoin={handleStartJoin} />
      </div>
    </>
  );
}
