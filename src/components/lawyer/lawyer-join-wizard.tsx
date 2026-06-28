'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LawyerFormStep } from './lawyer-form-step';
import { LawyerUploadStep } from './lawyer-upload-step';
import { LawyerPackageStep } from './lawyer-package-step';
import { LawyerPromoSection } from './lawyer-promo-section';
import { useAuth } from '@/hooks/use-auth';

export interface LawyerFormData {
  name: string;
  gender: string;
  lawFirm: string;
  licenseNumber: string;
  specialties: string[];
  education: string;
  graduatedSchool: string; // 毕业院校
  workingYears: string; // 执业年限
  city: string; // 所在城市
  phone: string;
  wechat: string; // 微信号
  licenseImages: string[];
  idCardImages: string[];
  educationImages: string[];
  packageType: string;
  packagePrice: number;
}

const initialFormData: LawyerFormData = {
  name: '',
  gender: '',
  lawFirm: '',
  licenseNumber: '',
  specialties: [],
  education: '',
  graduatedSchool: '', // 毕业院校
  workingYears: '', // 执业年限
  city: '', // 所在城市
  phone: '',
  wechat: '', // 微信号
  licenseImages: [],
  idCardImages: [],
  educationImages: [],
  packageType: '',
  packagePrice: 0,
};

interface LawyerJoinWizardProps {
  onBack?: () => void;
}

export function LawyerJoinWizard({ onBack }: LawyerJoinWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<LawyerFormData>(initialFormData);
  const [showPromo, setShowPromo] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [authGraceExpired, setAuthGraceExpired] = useState(false);
  const { user, isLoggedIn, isLoading } = useAuth();

  // 登录检查
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      setShowLoginPrompt(true);
    }
  }, [isLoading, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      setShowLoginPrompt(false);
    }
  }, [isLoggedIn]);

  // 如果认证状态迟迟没有结束，给页面一个兜底，避免永远停在加载中
  useEffect(() => {
    if (!isLoading) {
      setAuthGraceExpired(false);
      return;
    }

    const timer = setTimeout(() => {
      setAuthGraceExpired(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (authGraceExpired && !isLoggedIn) {
      setShowLoginPrompt(true);
    }
  }, [authGraceExpired, isLoggedIn]);

  // 从宣传页进入表单时，滚动到顶部
  useEffect(() => {
    if (!showPromo) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  }, [showPromo]);


  // 打开登录弹窗
  const handleOpenLogin = () => {
    window.dispatchEvent(new CustomEvent('open-login-modal'));
  };

  const updateFormData = (updates: Partial<LawyerFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleBack = () => {
    if (step === 1 && onBack) {
      onBack();
    } else if (step === 1 && showPromo) {
      setShowPromo(false);
    } else {
      setStep(step - 1);
      // 延迟 300ms 确保 DOM 完全渲染
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300);
    }
  };

  // 统一处理步骤切换 + 滚动到顶部
  const handleStepChange = (newStep: number) => {
    setStep(newStep);
    // 延迟 300ms 确保 DOM 完全渲染
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  const scrollToForm = () => {
    setShowPromo(false);
    // useEffect 会处理滚动到顶部
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <LawyerFormStep
            formData={formData}
            onUpdate={updateFormData}
            onNext={() => handleStepChange(2)}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <LawyerUploadStep
            formData={formData}
            onUpdate={updateFormData}
            onNext={() => handleStepChange(3)}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <LawyerPackageStep
            formData={formData}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  // 加载中：只在短暂等待期内显示，避免页面长时间卡死
  if (isLoading && !authGraceExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #F0FDF4 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在检查登录状态...</p>
        </div>
      </div>
    );
  }

  // 已是认证律师，无需重复入驻
  if (user?.isLawyer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #F0FDF4 100%)' }}>
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">您已是认证律师</h2>
          <p className="text-gray-500 mb-6">无需重复入驻，可前往律师工作台管理您的业务</p>
          <a
            href="/lawyer/dashboard"
            className="block w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-xl font-semibold transition-all"
          >
            前往律师工作台
          </a>
          <button
            onClick={onBack}
            className="w-full mt-3 text-gray-500 py-2 text-sm hover:text-gray-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // 未登录提示
  if (showLoginPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #F0FDF4 100%)' }}>
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">请先登录</h2>
          <p className="text-gray-500 mb-6">
            成为臻选律师需要先登录平台账号
          </p>
          <button
            onClick={handleOpenLogin}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-xl font-semibold transition-all"
          >
            手机号登录
          </button>
          <button
            onClick={onBack}
            className="w-full mt-3 text-gray-500 py-2 text-sm hover:text-gray-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (showPromo) {
    return (
      <div>
        <LawyerPromoSection onStartApply={scrollToForm} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #F0FDF4 100%)' }}>
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-green-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 sm:gap-2 text-green-600 hover:text-green-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-medium hidden sm:inline">返回</span>
            </button>
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-semibold text-green-600">律师入驻</span>
            </div>
            
            {/* Placeholder */}
            <div className="w-16 sm:w-24" />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/50 border-b border-green-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center">
                <div className={`
                  flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium transition-all duration-300
                  ${step >= s 
                    ? 'bg-green-500 text-white' 
                    : 'bg-green-100 text-green-400'
                  }
                `}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`
                    flex-1 h-0.5 mx-2 transition-all duration-300
                    ${step > s ? 'bg-green-500' : 'bg-green-100'}
                  `} />
                )}
              </div>
            ))}
          </div>
          {/* Step Labels */}
          <div className="flex justify-between mt-2 px-1">
            <span className="text-xs text-muted-foreground">填写信息</span>
            <span className="text-xs text-muted-foreground">上传材料</span>
            <span className="text-xs text-muted-foreground">选择套餐</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Platform Promise Banner */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 sm:p-6 mb-6 text-white shadow-lg">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              90天退款兜底保障
            </h3>
            <p className="text-sm text-green-100">
              成为臻选律师后，平台若90日内未有派发案件，请于7日内添加客服申请<strong>，可无条件全额退款</strong>；
              若不选择退款，平台<strong>自动赠送6个月</strong>会员时长。
            </p>
          </div>

          {/* Card Container */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-green-100/50 p-4 sm:p-6 md:p-8">
            {renderStep()}
          </div>

          {/* Rules Section */}
          <div className="mt-6 bg-white/60 backdrop-blur rounded-2xl p-4 sm:p-6 border border-green-100/50">
            <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              退款保障说明
            </h4>
            <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                成为臻选律师后，平台若90日内未向您分派案件，可申请全额退款
              </p>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                退款期在未向您分派案件90日届满后的7日内。
              </p>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                会员有效期从审核通过之日起算，续费为到期日顺延
              </p>
              <p className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                到期未续费自动降级为普通用户，历史数据全部保留
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
