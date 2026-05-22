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

  // 名校数据 - 平台律师毕业于以下顶尖法学院等众多国内知名院校
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
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="animate-pulse text-orange-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="pl-0 hover:bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        {/* Hero Section */}
        <section className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 mb-6 shadow-xl shadow-orange-200">
            <img 
	            src="/logo-bangbang.png"
	            alt="帮帮问法"
	            className="w-12 h-12 object-contain"
	          />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">了解帮帮</h1>
          <p className="text-gray-500 text-lg">关于我们</p>
        </section>

        {/* Who We Are Section */}
        <section className="mb-8 animate-slide-up stagger-1">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-3xl p-6 md:p-8 border border-orange-100 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <img 
	              src="/logo-bangbang.png"
	              alt="帮帮问法"
	              className="w-8 h-8 object-contain"
	            />
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">我们是谁？</h2>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-orange-600">法律科技新型公司</p>
                  <p className="text-gray-600 leading-relaxed">
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
        <section className="mb-8 animate-slide-up stagger-2">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            入驻要求
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {requirements.map((req, index) => {
              const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
                green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
                blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
              };
              const colors = colorMap[req.color];
              const Icon = req.icon;
              
              return (
                <div 
                  key={index}
                  className={`${colors.bg} rounded-2xl p-5 border ${colors.border}`}
                >
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{req.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{req.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* University Background Section */}
        <section className="mb-8 animate-slide-up stagger-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-orange-500" />
            学历背景
          </h2>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 md:p-8">
            <p className="text-center text-gray-600 mb-6">
              平台律师毕业于以下顶尖法学院等众多国内知名院校
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {universities.map((uni, index) => (
                <div 
                  key={index}
                  className="flex flex-col items-center gap-2"
                >
                  <div 
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 border border-gray-100 p-2"
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
                  <span className="text-sm font-medium text-gray-700">
                    {uni.name}
                  </span>
                </div>
              ))}
              {/* 省略号表示更多院校 */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gray-50 flex items-center justify-center shadow-lg border border-gray-100">
                  <span className="text-3xl text-gray-400">…</span>
                </div>
                <span className="text-sm font-medium text-gray-500">
              
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="mb-8 animate-slide-up stagger-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
            我们的定位
          </h2>
          
          {/* We Are */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              我们是
            </h3>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-5 border border-green-200">
              <div className="grid md:grid-cols-2 gap-4">
                {positives.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">{item.text}</p>
                      <p className="text-sm text-green-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* We Are Not */}
          <div>
            <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              我们不是
            </h3>
            <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-5 border border-red-200">
              <div className="grid md:grid-cols-3 gap-4">
                {exclusions.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <XCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-800">{item.text}</p>
                      <p className="text-xs text-red-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WeChat QR Code Section */}
        <section className="mb-8 animate-slide-up stagger-5">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-3xl p-6 md:p-8 border border-blue-200">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center gap-2">
              <QrCode className="w-6 h-6 text-blue-500" />
              关注公众号
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8">
              <div className="w-40 h-40 md:w-48 md:h-48 bg-white rounded-3xl p-3 shadow-lg">
                <Image 
                  src="/wechat-qr.png" 
                  alt="公众号二维码"
                  width={180}
                  height={180}
                  className="w-full h-full object-contain"
                  unoptimized
                />
              </div>
              <div className="text-center sm:text-left space-y-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900">扫码关注，了解更多</p>
                  <p className="text-gray-500">第一时间获取法律资讯</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">获取最新法律科普内容</p>
                  <p className="text-sm text-gray-600">诚邀律师加入帮帮，让你的专业配得上应有的价值</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center animate-slide-up stagger-6">
          <div className="inline-flex relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
            <Link href="/?start=consult">
              <Button 
                size="lg" 
                className="relative bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-full px-10 py-6 text-lg font-semibold h-auto shadow-xl shadow-orange-200/50 transition-all duration-300 hover:scale-105"
              >
                立即开始咨询
              </Button>
            </Link>
          </div>
        </section>

        {/* Bottom Spacing */}
        <div className="h-12" />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 bg-white/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            © 2024 帮帮问法 · 隐私声明 · 服务条款
          </p>
        </div>
      </footer>
    </div>
  );
}
