/**
 * 企业微信 Webhook 通知工具（中文版）
 * 
 * 使用方法：
 * 1. 在企业微信建一个群 → 添加群机器人 → 复制 Webhook URL
 * 2. 将 URL 填入 .env.local 的 ORDER_WEBHOOK_URL
 * 3. 需要通知的地方调用 notifyOrder(info)
 */

const WEBHOOK_URL_KEY = 'ORDER_WEBHOOK_URL';

interface OrderInfo {
  /** 订单类型 */
  type: string;
  /** 用户姓名或联系人 */
  userName: string;
  /** 联系手机号 */
  phone?: string;
  /** 金额（单位：分） */
  amount?: number;
  /** 套餐/案件类型 */
  detail?: string;
  /** 订单 ID */
  orderId?: string | number;
  /** 状态 */
  status?: string;
  /** 本次通知对应的业务事件 */
  event?: 'created' | 'paid';
}

/**
 * 发送纯文本消息到 Webhook URL
 */
async function sendText(content: string): Promise<void> {
  const webhookUrl = process.env[WEBHOOK_URL_KEY];
  if (!webhookUrl) return;

  try {
    const payload = { msgtype: 'text', text: { content } };
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('[Webhook] send failed:', response.status, await response.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('[Webhook] send error:', err);
  }
}

/**
 * 构建中文订单通知文本
 */
function buildOrderMessage(info: OrderInfo): string {
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const amountStr = info.amount !== undefined ? `¥${(info.amount / 100).toFixed(2)}` : '';

  const lines = [info.event === 'paid' ? '帮帮问法 - 支付成功通知' : '帮帮问法 - 下单通知', ''];

  // 类型映射
  const typeMap: Record<string, string> = {
    Consult: '咨询订单',
    Renew: '律师续费',
    Registration: '律师入驻',
  };
  lines.push(`类型：${typeMap[info.type] || info.type}`);
  lines.push(`用户：${info.userName}`);
  if (info.phone) lines.push(`联系方式：${info.phone}`);
  if (amountStr) lines.push(`金额：${amountStr}`);
  if (info.detail) lines.push(`详情：${info.detail}`);
  if (info.status) {
    const statusMap: Record<string, string> = {
      'Pending Payment': '待支付',
      'Pending Review': '待审核',
      Paid: '已支付',
      Completed: '已完成',
    };
    lines.push(`状态：${statusMap[info.status] || info.status}`);
  }
  lines.push(`时间：${timeStr}`);
  if (info.orderId) lines.push(`单号：${info.orderId}`);

  return lines.join('\n');
}

/**
 * 发送订单通知
 * 通知失败不影响业务逻辑
 */
export async function notifyOrder(info: OrderInfo): Promise<void> {
  const content = buildOrderMessage(info);
  await sendText(content);
}
