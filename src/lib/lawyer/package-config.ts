export const LAWYER_ONBOARDING_PACKAGES = [
  {
    id: 'civil_premium',
    name: '民事律师（臻选）',
    duration: '18个月',
    features: ['优先接收添加微信的民事客户', '平台流量扶持', '专属认证标识', '专属客服服务'],
    color: 'blue',
  },
  {
    id: 'criminal_premium',
    name: '刑事律师（臻选）',
    duration: '18个月',
    features: ['优先接收添加微信的刑事客户', '平台流量扶持', '专属认证标识', '专属客服服务'],
    color: 'orange',
  },
] as const;

export const LAWYER_UPLOAD_REQUIREMENTS = [
  { key: 'licenseImages', title: '律师执业证', requiredCount: 2 },
  { key: 'idCardImages', title: '身份证照片', requiredCount: 3 },
  { key: 'educationImages', title: '学历证明', requiredCount: 1 },
] as const;

type UploadPayload = Partial<Record<(typeof LAWYER_UPLOAD_REQUIREMENTS)[number]['key'], unknown>>;

export function getMissingRequirements(payload: UploadPayload) {
  return LAWYER_UPLOAD_REQUIREMENTS.flatMap(({ key, title, requiredCount }) => {
    const count = Array.isArray(payload[key]) ? payload[key]!.length : 0;
    const missing = Math.max(requiredCount - count, 0);
    return missing > 0 ? [{ key, title, missing }] : [];
  });
}

export function validateUploadRequirements(payload: UploadPayload) {
  return getMissingRequirements(payload).length === 0;
}

export const RENEWAL_PACKAGE_META = {
  civil_renew_quarter: { name: '民事律师季卡', type: 'civil', months: 3, duration: '3个月' },
  civil_renew_year: { name: '民事律师年卡', type: 'civil', months: 12, duration: '12个月' },
  criminal_renew_quarter: { name: '刑事律师季卡', type: 'criminal', months: 3, duration: '3个月' },
  criminal_renew_year: { name: '刑事律师年卡', type: 'criminal', months: 12, duration: '12个月' },
} as const;

export type RenewalPackageId = keyof typeof RENEWAL_PACKAGE_META;
