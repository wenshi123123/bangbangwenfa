'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, Award, Shield, Users, QrCode, GraduationCap, Sparkles } from 'lucide-react';

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);



  // 名校数据 - 平台律师毕业于以下顶尖法学院等众多国内知名院校(测试提交)
  const universities = [
    { name: '清华大学', src: '/tsinghua.png', alt: '清华大学' },
    { name: '北京大学', src: '/pku.png', alt: '北京大学' },
    { name: '中国政法大学', src: '/cupsl.png', alt: '中国政法大学' },
    { name: '复旦大学', src: '/fudan.png', alt: '复旦大学' },
    { name: '上海交通大学', src: '/shangjiao.png', alt: '上海交通大学' },
  ];

  // 入驻要求
  const requirements = [
    {
      icon: Award,
      title: '执业认证',
      desc: '入驻律师均持有中华人民共和国律师执业证，经过司法行政部门认证审核',
      color: 'orange',
    },
    {
      icon: CheckCircle,
      title: '考核合规',
      desc: '每年通过司法局年度考核，持续保持专业能力和职业操守',
      color: 'green',
    },
    {
      icon: Shield,
      title: '无重大处分处罚',
      desc: '无行业惩戒记录，无行政处罚，执业记录良好，信誉可靠',
      color: 'blue',
    },
  ];

  // 正向定位
  const positives = [
    { text: '法律科技新型公司', desc: '创新驱动，法律与科技融合' },
    { text: '注重人与人最本质的交流', desc: '在AI时代，我们相信真人与真人的对话价值' },
  ];

  // 排除项
  const exclusions = [
    { text: '非网推所', desc: '专注品质，不做流量营销' },
    { text: '非法律咨询公司', desc: '专业律师团队，拒绝中介层层转包' },
    { text: '非不正规机构', desc: '合规经营，持证上岗' },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-pulse text-[#C47353]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)]">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="pl-0 hover:bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl border border-[rgba(196,115,83,0.2)] mb-6 hover:scale-105 transition-transform duration-250">
            <img 
	            src="/logo-bangbang.png"
	            alt="帮帮问法"
	            className="w-12 h-12 object-contain"
	          />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-[#3D322D] font-normal mb-3">了解帮帮</h1>
          <p className="text-[#8C7B6E] text-lg">关于我们</p>
        </section>

        {/* Who We Are Section */}
        <section className="mb-8">
          <div className="bg-white border border-[rgba(196,115,83,0.2)] rounded-xl p-6 md:p-8 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(61,50,45,0.06)] transition-all duration-250">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl border border-[rgba(196,115,83,0.2)] flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform duration-250">
                <img 
	              src="/logo-bangbang.png"
	              alt="帮帮问法"
	              className="w-8 h-8 object-contain"
	            />
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-serif text-[#3D322D] font-normal mb-3">我们是谁？</h2>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-[#C47353]">法律科技新型公司</p>
                  <p className="text-[#8C7B6E] leading-relaxed">
                    在AI浪潮下，我们更注重人与人之间最本质的交流价值。
                    我们相信，每一个法律问题背后都是一个真实的人，
                    需要另一个真实的人来倾听、理解并提供帮助。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Requirements Section */}
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-serif text-[#3D322D] font-normal mb-6 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-[#C47353]" />
            入驻要求
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {requirements.map((req, index) => {
              const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                orange: { bg: 'bg-[#FAF7F2]', text: 'text-[#C47353]', border: 'border-[rgba(196,115,83,0.2)]' },
                green: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', border: 'border-[#BBF7D0]' },
                blue: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', border: 'border-[#BFDBFE]' },
              };
              const colors = colorMap[req.color];
              const Icon = req.icon;
              
              return (
                <div 
                  key={index}
                  className={`${colors.bg} rounded-xl p-5 border ${colors.border} hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(61,50,45,0.06)] transition-all duration-250`}
                >
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <h3 className="font-serif text-[#3D322D] font-normal mb-2">{req.title}</h3>
                  <p className="text-sm text-[#8C7B6E] leading-relaxed">{req.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* University Background Section */}
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-serif text-[#3D322D] font-normal mb-6 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#C47353]" />
            学历背景
          </h2>
          <div className="bg-[#FAF7F2] rounded-xl p-6 md:p-8 border border-[rgba(196,115,83,0.2)]">
            <p className="text-center text-[#8C7B6E] mb-6">
              平台律师毕业于以下顶尖法学院等众多国内知名院校
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {universities.map((uni, index) => (
                <div 
                  key={index}
                  className="flex flex-col items-center gap-2"
                >
                  <div 
                    className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white flex items-center justify-center shadow-[0_4px_16px_rgba(61,50,45,0.08)] hover:scale-110 transition-transform duration-300 border border-[rgba(196,115,83,0.2)] p-2"
                  >
                    <Image 
                      src={uni.src} 
                      alt={uni.alt}
                      width={80}
                      height={80}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                  <span className="text-sm font-medium text-[#3D322D]">
                    {uni.name}
                  </span>
                </div>
              ))}
              {/* 省略号表示更多院校 */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-[#FAF7F2] flex items-center justify-center shadow-[0_4px_16px_rgba(61,50,45,0.08)] border border-[rgba(196,115,83,0.2)]">
                  <span className="text-3xl text-[#8C7B6E]">…</span>
                </div>
                <span className="text-sm font-medium text-[#8C7B6E]">
              
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-serif text-[#3D322D] font-normal mb-6">
            我们的定位
          </h2>
          
          {/* We Are */}
          <div className="mb-4">
            <h3 className="text-lg font-serif text-[#3D322D] font-normal mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#C47353]" />
              我们是
            </h3>
            <div className="bg-[#FAF7F2] rounded-xl p-5 border border-[rgba(196,115,83,0.2)]">
              <div className="grid md:grid-cols-2 gap-4">
                {positives.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C47353] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-[#3D322D]">{item.text}</p>
                      <p className="text-sm text-[#8C7B6E]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* We Are Not */}
          <div>
            <h3 className="text-lg font-serif text-[#3D322D] font-normal mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-[#8C7B6E]" />
              我们不是
            </h3>
            <div className="bg-white rounded-xl p-5 border border-[rgba(196,115,83,0.15)]">
              <div className="grid md:grid-cols-3 gap-4">
                {exclusions.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#8C7B6E]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <XCircle className="w-4 h-4 text-[#8C7B6E]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#3D322D]">{item.text}</p>
                      <p className="text-xs text-[#8C7B6E]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WeChat QR Code Section */}
        <section className="mb-8">
          <div className="bg-[#FAF7F2] rounded-xl p-6 md:p-8 border border-[rgba(196,115,83,0.2)]">
            <h2 className="text-xl md:text-2xl font-serif text-[#3D322D] font-normal mb-6 text-center flex items-center justify-center gap-2">
              <QrCode className="w-6 h-6 text-[#C47353]" />
              关注公众号
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8">
              <div className="w-40 h-40 md:w-48 md:h-48 bg-white rounded-xl p-3 shadow-[0_4px_16px_rgba(61,50,45,0.08)] border border-[rgba(196,115,83,0.2)]">
                <Image 
                  src="/wechat-qr.jpg" 
                  alt="公众号二维码"
                  width={180}
                  height={180}
                  className="w-full h-full object-contain"
                  unoptimized
                />
              </div>
              <div className="text-center sm:text-left space-y-3">
                <div>
                  <p className="text-lg font-medium text-[#3D322D]">扫码关注，了解更多</p>
                  <p className="text-[#8C7B6E]">第一时间获取法律资讯</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[#8C7B6E]">获取最新法律科普内容</p>
                  <p className="text-sm text-[#8C7B6E]">诚邀律师加入帮帮，让你的专业配得上应有的价值</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="w-full sm:w-auto inline-flex relative group">
            <div className="absolute -inset-1 bg-[#C47353] rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <Link href="/?start=consult" className="w-full sm:w-auto block">
              <Button 
                size="lg" 
                className="w-full sm:w-auto relative bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full px-10 py-6 text-lg font-medium h-auto shadow-[0_4px_16px_rgba(196,115,83,0.3)] transition-all duration-250 hover:-translate-y-[2px] active:scale-95"
              >
                立即开始咨询
              </Button>
            </Link>
          </div>
        </section>

        {/* Bottom Spacing */}
        <div className="h-12" />
      </div>
    </div>
  );
}
