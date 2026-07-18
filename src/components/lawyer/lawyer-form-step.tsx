'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { LawyerFormData } from './lawyer-join-wizard';
import { Check } from 'lucide-react';
import { cityGroups, getProvinceByCity } from '@/lib/city-data';

interface LawyerFormStepProps {
  formData: LawyerFormData;
  onUpdate: (updates: Partial<LawyerFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// 擅长案件类型选项
const specialtyOptions = [
  // 民事类
  { id: 'marriage', label: '婚姻继承', category: 'civil' },
  { id: 'contract', label: '合同债务', category: 'civil' },
  { id: 'property', label: '房产纠纷', category: 'civil' },
  { id: 'labor', label: '劳动纠纷', category: 'civil' },
  { id: 'traffic_civil', label: '交通事故', category: 'civil' },
  { id: 'medical', label: '医疗纠纷', category: 'civil' },
  // 刑事类
  { id: 'fraud', label: '诈骗类', category: 'criminal' },
  { id: 'theft', label: '盗窃类', category: 'criminal' },
  { id: 'assault', label: '故意伤害', category: 'criminal' },
  { id: 'drugs', label: '毒品犯罪', category: 'criminal' },
  { id: 'economy', label: '经济犯罪', category: 'criminal' },
  { id: 'traffic_crime', label: '交通犯罪', category: 'criminal' },
];

// 学历选项
const educationOptions = ['专科', '本科', '硕士研究生', '博士研究生'];

// 性别选项
const genderOptions = ['男', '女'];

export function LawyerFormStep({ formData, onUpdate, onNext, onBack }: LawyerFormStepProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>(
    () => getProvinceByCity(formData.city) || ''
  );

  // 城市变化时同步省份
  useEffect(() => {
    const p = getProvinceByCity(formData.city);
    if (p) setSelectedProvince(p);
  }, [formData.city]);

  const handleProvinceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const p = e.target.value;
    setSelectedProvince(p);
    onUpdate({ city: '' });
  };

  const handleCityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ city: e.target.value });
  };

  const handleToggleSpecialty = (id: string) => {
    const newSpecialties = formData.specialties.includes(id)
      ? formData.specialties.filter(s => s !== id)
      : [...formData.specialties, id];
    onUpdate({ specialties: newSpecialties });
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.gender !== '' &&
      formData.lawFirm.trim() !== '' &&
      formData.licenseNumber.length === 17 && // 固定17位数字
      formData.specialties.length > 0 &&
      formData.education !== '' &&
      formData.graduatedSchool.trim() !== '' && // 毕业院校必填
      formData.workingYears !== '' && parseInt(formData.workingYears) > 0 && // 执业年限必填
      formData.city.trim() !== '' && // 城市必填
      /^\d{11}$/.test(formData.phone) &&
      formData.wechat.trim() !== ''
    );
  };

  const civilSpecialties = specialtyOptions.filter(s => s.category === 'civil');
  const criminalSpecialties = specialtyOptions.filter(s => s.category === 'criminal');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-green-50 border border-green-100 mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-green-700">Step 1 / 3</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
          入驻信息填写
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
          请填写真实的律师入驻信息
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 sm:space-y-5 mb-6">
        {/* 姓名 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="请输入您的真实姓名"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card focus:border-green-400 focus:outline-none transition-all duration-300 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* 性别 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            性别 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {genderOptions.map((option) => (
              <button
                key={option}
                onClick={() => onUpdate({ gender: option })}
                className={`
                  flex-1 py-3 rounded-xl border-2 font-medium transition-all duration-300
                  ${formData.gender === option
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-border bg-card text-muted-foreground hover:border-green-200'
                  }
                `}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* 所属律所 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            所属律所 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.lawFirm}
            onChange={(e) => onUpdate({ lawFirm: e.target.value })}
            placeholder="请输入您所在的律师事务所名称"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card focus:border-green-400 focus:outline-none transition-all duration-300 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* 律师执业证号 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            律师执业证号码 <span className="text-red-500">*</span>
            <span className="text-xs text-muted-foreground font-normal ml-2">（17位数字）</span>
          </label>
          <input
            type="text"
            value={formData.licenseNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 17);
              onUpdate({ licenseNumber: value });
            }}
            placeholder="请输入17位律师执业证号码"
            maxLength={17}
            className={`w-full px-4 py-3 rounded-xl border-2 bg-card focus:outline-none transition-all duration-300 text-foreground placeholder:text-muted-foreground ${
              formData.licenseNumber.length > 0 && formData.licenseNumber.length !== 17
                ? 'border-red-400 focus:border-red-400'
                : 'border-border focus:border-green-400'
            }`}
          />
          {formData.licenseNumber.length > 0 && formData.licenseNumber.length !== 17 && (
            <p className="text-xs text-red-500 mt-1">请输入完整的17位数字，当前已输入 {formData.licenseNumber.length} 位</p>
          )}
        </div>

        {/* 擅长案件类型 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            擅长案件类型 <span className="text-red-500">*</span>
            <span className="text-xs text-muted-foreground font-normal ml-2">（可多选）</span>
          </label>
          
          {/* 民事类 */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              民事类
            </p>
            <div className="grid grid-cols-3 gap-2">
              {civilSpecialties.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleToggleSpecialty(option.id)}
                  className={`
                    py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all duration-300
                    ${formData.specialties.includes(option.id)
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-border bg-card text-muted-foreground hover:border-blue-200'
                    }
                  `}
                >
                  {formData.specialties.includes(option.id) && (
                    <Check className="w-3 h-3 inline mr-1" />
                  )}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 刑事类 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              刑事类
            </p>
            <div className="grid grid-cols-3 gap-2">
              {criminalSpecialties.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleToggleSpecialty(option.id)}
                  className={`
                    py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all duration-300
                    ${formData.specialties.includes(option.id)
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-border bg-card text-muted-foreground hover:border-orange-200'
                    }
                  `}
                >
                  {formData.specialties.includes(option.id) && (
                    <Check className="w-3 h-3 inline mr-1" />
                  )}
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 最高学历 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            最高学历 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {educationOptions.map((option) => (
              <button
                key={option}
                onClick={() => onUpdate({ education: option })}
                className={`
                  flex-1 py-3 rounded-xl border-2 font-medium transition-all duration-300
                  ${formData.education === option
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-border bg-card text-muted-foreground hover:border-green-200'
                  }
                `}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* 毕业院校 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            毕业院校 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.graduatedSchool}
            onChange={(e) => onUpdate({ graduatedSchool: e.target.value })}
            placeholder="请输入您的毕业院校名称"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card focus:border-green-400 focus:outline-none transition-all duration-300 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* 联系电话 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            联系电话 <span className="text-red-500">*</span>
            <span className="text-xs text-muted-foreground font-normal ml-2">（11位数字）</span>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={formData.phone}
            onChange={(e) => onUpdate({ phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
            placeholder="请输入11位手机号码"
            maxLength={11}
            className={`w-full px-4 py-3 rounded-xl border-2 bg-card focus:outline-none transition-all duration-300 text-foreground placeholder:text-muted-foreground ${
              formData.phone.length > 0 && formData.phone.length !== 11
                ? 'border-red-400 focus:border-red-400'
                : 'border-border focus:border-green-400'
            }`}
          />
          {formData.phone.length > 0 && formData.phone.length !== 11 && (
            <p className="text-xs text-red-500 mt-1">请输入完整的11位数字，当前已输入 {formData.phone.length} 位</p>
          )}
        </div>

        {/* 微信号 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            微信号 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.wechat}
            onChange={(e) => onUpdate({ wechat: e.target.value })}
            placeholder="请输入您的微信号（方便客户联系您）"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card focus:border-green-400 focus:outline-none transition-all duration-300 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* 执业年限 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            执业年限 <span className="text-red-500">*</span>
            <span className="text-xs text-muted-foreground font-normal ml-2">（年）</span>
          </label>
          <input
            type="number"
            min="0"
            max="60"
            value={formData.workingYears}
            onChange={(e) => {
              const val = Math.min(60, Math.max(0, parseInt(e.target.value) || 0));
              onUpdate({ workingYears: val.toString() });
            }}
            placeholder="请输入您的执业年限"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card focus:border-green-400 focus:outline-none transition-all duration-300 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* 所在城市（省份→城市 二级联动） */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            所在城市 <span className="text-red-500">*</span>
          </label>

          {/* 省份 */}
          <select
            value={selectedProvince}
            onChange={handleProvinceChange}
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card focus:border-green-400 focus:outline-none transition-all duration-300 text-foreground appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 16px center',
              paddingRight: '40px',
            }}
          >
            <option value="">请选择省份</option>
            {cityGroups.map((group) => (
              <option key={group.province} value={group.province}>{group.province}</option>
            ))}
          </select>

          {/* 城市（省份选定后显示） */}
          {selectedProvince && (
            <select
              value={formData.city}
              onChange={handleCityChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card focus:border-green-400 focus:outline-none transition-all duration-300 text-foreground appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
                paddingRight: '40px',
              }}
            >
              <option value="">请选择城市</option>
              {cityGroups.find((g) => g.province === selectedProvince)?.cities.map((cityName) => (
                <option key={cityName} value={cityName}>{cityName}</option>
              ))}
              <option value="其他城市">其他城市</option>
            </select>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base border-2 border-border bg-card hover:bg-muted transition-all duration-300"
        >
          上一步
        </button>
        <button
          onClick={onNext}
          disabled={!isFormValid()}
          className={`
            flex-[2] py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300
            ${isFormValid()
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          下一步，上传材料
        </button>
      </div>
    </div>
  );
}
