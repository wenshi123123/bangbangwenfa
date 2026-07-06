export function getAdminOrderServiceLabel(serviceType: string | null | undefined) {
  const serviceTypeMap: Record<string, string> = {
    basic: '基础咨询',
    standard: '标准咨询',
    advanced: '深度咨询',
    consult: '咨询服务',
    'consult,full': '咨询+全套服务',
    lawyer_subscription: '律师订阅',
    civil_premium: '民事律师（臻选）',
    criminal_premium: '刑事律师（臻选）',
    civil: '民事律师（臻选）',
    criminal: '刑事律师（臻选）',
  };

  return serviceTypeMap[serviceType || ''] || '其他服务';
}

export function getAdminLawyerResponseText(rawResponse: string | null | undefined) {
  if (!rawResponse) return '';
  try {
    const parsed = JSON.parse(rawResponse);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed.content === 'string') return parsed.content;
  } catch {
    // 兼容历史纯文本
  }
  return rawResponse;
}
