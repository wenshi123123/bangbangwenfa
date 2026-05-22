'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, CheckCircle, XCircle, Award, Shield, Users, QrCode, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LawyerStandardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 名校数据 - 用于轮播
const universities = [
  { name: '清华大学', abbr: '清华', color: 'bg-blue-600', textColor: 'text-blue-600' },
  { name: '北京大学', abbr: '北大', color: 'bg-red-600', textColor: 'text-red-600' },
  { name: '中国人民大学', abbr: '人大', color: 'bg-amber-600', textColor: 'text-amber-600' },
  { name: '中国政法大学', abbr: '政法', color: 'bg-emerald-600', textColor: 'text-emerald-600' },
  { name: '复旦大学', abbr: '复旦', color: 'bg-purple-600', textColor: 'text-purple-600' },
  { name: '上海交通大学', abbr: '上交', color: 'bg-cyan-600', textColor: 'text-cyan-600' },
];

export function LawyerStandardsModal({ isOpen, onClose }: LawyerStandardsModalProps) {
  const [currentUniIndex, setCurrentUniIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 自动轮播名校
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentUniIndex((prev) => (prev + 1) % universities.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  // 入驻要求
  const requirements = [
    {
      icon: <Award className="w-5 h-5" />,
      title: '执业认证',
      desc: '入驻律师均持有中华人民共和国律师执业证',
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      title: '考核合规',
      desc: '每年通过司法局年度考核，持续保持专业能力',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: '无重大处分处罚',
      desc: '无行业惩戒记录，无行政处罚，执业记录良好',
    },
  ];

  // 正向定位
  const positives = [
    { text: '法律科技新型公司', icon: <CheckCircle className="w-4 h-4" /> },
    { text: '注重人与人最本质的交流', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  // 排除项
  const exclusions = [
    { text: '非网推所', icon: <XCircle className="w-4 h-4" /> },
    { text: '非法律咨询公司', icon: <XCircle className="w-4 h-4" /> },
    { text: '非不正规机构', icon: <XCircle className="w-4 h-4" /> },
  ];

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl transition-all duration-300 ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 mb-4 shadow-lg shadow-orange-200">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">了解帮帮</h2>
            <p className="text-sm sm:text-base text-gray-500">关于我们</p>
          </div>

          {/* Who We Are */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-2xl p-4 mb-6 border border-orange-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">我们是谁？</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  法律科技新型公司，在AI浪潮下，我们更注重人与人之间最本质的交流价值
                </p>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              入驻要求
            </h3>
            <div className="space-y-2">
              {requirements.map((req, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                    {req.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm">{req.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{req.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* University Carousel */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-orange-500" />
              学历背景
            </h3>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 p-6">
              {/* University Badge */}
              <div className="flex items-center justify-center">
                <div 
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${universities[currentUniIndex].color} flex items-center justify-center shadow-lg transition-all duration-500`}
                >
                  <span className="text-white text-xl sm:text-2xl font-bold">
                    {universities[currentUniIndex].abbr}
                  </span>
                </div>
              </div>
              
              {/* University Name */}
              <p className={`text-center mt-4 font-semibold ${universities[currentUniIndex].textColor} transition-all duration-500`}>
                {universities[currentUniIndex].name}
              </p>
              
              {/* Carousel Dots */}
              <div className="flex justify-center gap-1.5 mt-4">
                {universities.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentUniIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentUniIndex 
                        ? 'w-6 bg-orange-500' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Comparison Section */}
          <div className="mb-6">
            {/* Positive - We Are */}
            <div className="mb-3">
              <h3 className="text-base font-semibold text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                我们是
              </h3>
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <div className="space-y-2">
                  {positives.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-green-500">{item.icon}</span>
                      <span className="text-sm text-green-800 font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Negative - We Are Not */}
            <div>
              <h3 className="text-base font-semibold text-red-700 mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                我们不是
              </h3>
              <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                <div className="space-y-2">
                  {exclusions.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-red-500">{item.icon}</span>
                      <span className="text-sm text-red-800 font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* WeChat QR Code */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-2xl p-4 mb-6 border border-blue-100">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-blue-500" />
              关注公众号
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-2xl p-2 shadow-lg flex-shrink-0">
                <Image 
                  src="/wechat-qr.png" 
                  alt="公众号二维码"
                  width={120}
                  height={120}
                  className="w-full h-full object-contain"
                  unoptimized
                />
              </div>
              <div className="text-center sm:text-left space-y-1">
                <p className="text-sm sm:text-base font-medium text-gray-900">扫码关注，了解更多</p>
                <p className="text-xs sm:text-sm text-gray-500">第一时间获取法律资讯</p>
                <p className="text-xs sm:text-sm text-gray-500">加入社群，与律师直接沟通</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-200 transition-all duration-300"
            onClick={() => {
              window.open('weixin://', '_blank');
            }}
          >
            联系 / 加入我们
          </Button>
        </div>
      </div>
    </div>
  );
}
