'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { LawyerFormData } from './lawyer-join-wizard';

interface LawyerPackageStepProps {
  formData: LawyerFormData;
  onBack: () => void;
}

interface Package {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  duration: string;
  features: string[];
  color: string;
}

// 固定套餐配置（特征和服务内容）
const PACKAGE_CONFIGS = [
  {
    id: 'civil_premium',
    name: '民事律师（臻选）',
    duration: '18个月',
    features: [
      '优先接收添加微信的民事客户',
      '平台流量扶持',
      '专属认证标识',
      '专属客服服务',
    ],
    color: 'blue',
  },
  {
    id: 'criminal_premium',
    name: '刑事律师（臻选）',
    duration: '18个月',
    features: [
      '优先接收添加微信的刑事客户',
      '平台流量扶持',
      '专属认证标识',
      '专属客服服务',
    ],
    color: 'orange',
  },
];

export function LawyerPackageStep({ formData, onBack }: LawyerPackageStepProps) {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 从 API 加载价格数据
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/price?category=lawyer');
        const result = await response.json();
        
        if (result.success && result.data) {
          // 将价格配置映射到套餐
          const packagesData = PACKAGE_CONFIGS.map(config => {
            const priceConfig = result.data.find((p: any) => p.plan_id === config.id);
            // 兜底：如果 API 未返回匹配价格，使用默认值而非 0
            const defaultPrice = config.id === 'civil_premium' ? 500000 : 800000;
            const price = priceConfig?.price || defaultPrice;
            return {
              ...config,
              price,
              priceDisplay: (price / 100).toFixed(0),
            };
          });
          setPackages(packagesData);
        } else {
          // 如果 API 失败，使用默认值
          setPackages(PACKAGE_CONFIGS.map(config => ({
            ...config,
            price: config.id === 'civil_premium' ? 500000 : 800000,
            priceDisplay: config.id === 'civil_premium' ? '5000' : '8000',
          })));
        }
      } catch (error) {
        console.error('获取价格失败:', error);
        // 使用默认值
        setPackages(PACKAGE_CONFIGS.map(config => ({
          ...config,
          price: config.id === 'civil_premium' ? 500000 : 800000,
          priceDisplay: config.id === 'civil_premium' ? '5000' : '8000',
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  // 计算总价（价格单位是分，1元=100分）
  const totalPrice = packages
    .filter(pkg => selectedPackages.includes(pkg.id))
    .reduce((sum, pkg) => sum + pkg.price, 0);

  const totalPriceDisplay = (totalPrice / 100).toFixed(0);

  // 处理套餐选择（自由多选）
  const handlePackageSelect = (pkgId: string) => {
    if (selectedPackages.includes(pkgId)) {
      // 取消选择
      setSelectedPackages(selectedPackages.filter(id => id !== pkgId));
    } else {
      // 添加选择
      setSelectedPackages([...selectedPackages, pkgId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedPackages.length === 0) {
      alert('请至少选择一个套餐');
      return;
    }

    setIsSubmitting(true);

    try {
      // 获取用户信息（同时用于 header 和 body 中的 userId）
      const userInfoStr = localStorage.getItem('user_info');
      let userInfo: { id: number } | null = null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userInfoStr) {
        try {
          userInfo = JSON.parse(userInfoStr);
          headers['x-user-info'] = JSON.stringify({ id: userInfo.id });
        } catch (e) {
          console.error('解析用户信息失败:', e);
        }
      }

      // 使用第一个选中的套餐作为主套餐
      const primaryPkg = packages.find(p => p.id === selectedPackages[0]);

      // 创建入驻申请
      const response = await fetch('/api/lawyer/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: userInfo?.id,
          name: formData.name,
          gender: formData.gender,
          lawFirm: formData.lawFirm,
          licenseNumber: formData.licenseNumber,
          specialties: formData.specialties,
          education: formData.education,
          phone: formData.phone,
          licenseImages: formData.licenseImages,
          idCardImages: formData.idCardImages,
          educationImages: formData.educationImages,
          packageType: primaryPkg?.id || selectedPackages[0],
          packagePrice: totalPrice, // 使用总价格
          selectedPackages: selectedPackages, // 额外传递所有选中的套餐
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 跳转到支付页面前先滚动到顶部
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        router.push(`/lawyer/pay?applicationId=${result.data.applicationId}`);
      } else {
        alert(result.error || '提交失败，请重试');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    if (color === 'blue') {
      return isSelected
        ? 'border-blue-400 bg-blue-50 shadow-lg shadow-blue-100'
        : 'border-border hover:border-blue-200';
    } else {
      return isSelected
        ? 'border-orange-400 bg-orange-50 shadow-lg shadow-orange-100'
        : 'border-border hover:border-orange-200';
    }
  };

  const getAccentClasses = (color: string) => {
    return color === 'blue'
      ? 'from-blue-500 to-blue-600'
      : 'from-orange-500 to-orange-600';
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-green-50 border border-green-100 mb-3 sm:mb-4">
            <span className="text-xs sm:text-sm font-medium text-green-700">Step 3 / 3</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
            选择会员套餐
          </h2>
        </div>
        {/* Loading Skeleton */}
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="p-4 sm:p-6 rounded-xl border-2 border-border animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="h-6 w-32 bg-gray-200 rounded"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-4 w-48 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-green-50 border border-green-100 mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-green-700">Step 3 / 3</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
          选择会员套餐
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
          选择适合您的臻选律师会员类型（可多选）
        </p>
      </div>

      {/* Multi-select Hint */}
      {selectedPackages.length > 1 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-center">
          <p className="text-sm text-green-700">
            已选择 {selectedPackages.length} 个套餐，费用可累计叠加
          </p>
        </div>
      )}

      {/* Package Selection */}
      <div className="space-y-4 mb-6">
        {packages.map((pkg) => {
          const isSelected = selectedPackages.includes(pkg.id);

          return (
            <button
              key={pkg.id}
              onClick={() => handlePackageSelect(pkg.id)}
              disabled={loading}
              className={`
                w-full p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 text-left relative
                ${getColorClasses(pkg.color, isSelected)}
                ${loading ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              {/* Badge */}
              <div className="absolute -top-2 left-4 px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium rounded-full">
                90天无忧保障
              </div>

              {/* Package Header - 优化布局：价格左对齐，勾选图标右侧独立 */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-foreground mb-1">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground">会员时长：{pkg.duration}</p>
                </div>
                {/* 价格和勾选图标 - 水平排列，确保不重叠 */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground">
                      ¥{pkg.priceDisplay}
                    </div>
                    <div className="text-xs text-muted-foreground">元</div>
                  </div>
                  {/* Selection Indicator - 固定大小和位置 */}
                  <div className={`
                    w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0
                    ${isSelected
                      ? `border-2 bg-gradient-to-r ${getAccentClasses(pkg.color)} border-transparent`
                      : 'border-gray-300 bg-white'
                    }
                  `}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {pkg.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${getAccentClasses(pkg.color)}`} />
                    {feature}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6 border border-green-100">
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          申请信息确认
        </h4>
        {/* 单列布局，信息清晰不拥挤 */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground w-20 flex-shrink-0">姓名</span>
            <span className="font-medium">{formData.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground w-20 flex-shrink-0">性别</span>
            <span className="font-medium">{formData.gender}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-muted-foreground w-20 flex-shrink-0 pt-0.5">律所</span>
            <span className="font-medium">{formData.lawFirm}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground w-20 flex-shrink-0">执业证号</span>
            <span className="font-medium">{formData.licenseNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground w-20 flex-shrink-0">学历</span>
            <span className="font-medium">{formData.education}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground w-20 flex-shrink-0">擅长领域</span>
            <span className="font-medium">{formData.specialties.length}个领域</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground w-20 flex-shrink-0">联系电话</span>
            <span className="font-medium">{formData.phone}</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="bg-card rounded-xl p-4 mb-6 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">应付金额</span>
          <div className="text-right">
            <span className="text-3xl font-bold text-green-600">
              ¥{selectedPackages.length > 0 ? totalPriceDisplay : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base border-2 border-border bg-card hover:bg-muted transition-all duration-300 disabled:opacity-50"
        >
          上一步
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedPackages.length === 0}
          className={`
            flex-[2] py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300
            ${isSubmitting || selectedPackages.length === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-200'
            }
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              提交中...
            </span>
          ) : selectedPackages.length === 0 ? (
            '请选择套餐'
          ) : (
            `立即支付 ¥${totalPriceDisplay}`
          )}
        </button>
      </div>

      {/* Security Notice */}
      <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        支付安全 · 隐私保护 · 律师保密义务
      </p>
    </div>
  );
}
