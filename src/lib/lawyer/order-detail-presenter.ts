export function getLawyerOrderResponseText(rawResponse: string | null | undefined) {
  if (!rawResponse) return '';
  try {
    const parsed = JSON.parse(rawResponse);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed.content === 'string') return parsed.content;
  } catch {
    // 兼容历史纯文本数据
  }
  return rawResponse;
}
