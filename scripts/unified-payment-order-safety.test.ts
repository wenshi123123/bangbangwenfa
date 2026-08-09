import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = (file: string) => readFile(path.join(root, file), 'utf8');

async function main() {
  const [consultCreate, payCreate, payStatus, consultCallback, lawyerPayCreate, renewCreate, lifecycle, refundRoute, wechatPay] = await Promise.all([
    source('src/app/api/consult/create/route.ts'),
    source('src/app/api/pay/create/route.ts'),
    source('src/app/api/pay/status/route.ts'),
    source('src/app/api/pay/callback/route.ts'),
    source('src/app/api/lawyer/pay/create/route.ts'),
    source('src/app/api/lawyer/renew/route.ts'),
    source('src/lib/payment/order-lifecycle.ts'),
    source('src/app/api/admin/order/refund/route.ts'),
    source('src/lib/payment/wechat-pay.ts'),
  ]);

  assert.match(consultCreate, /payment_status.*pending.*paying|pending.*paying[\s\S]*consult_orders/, '咨询创建必须检查有效支付订单');
  assert.match(consultCreate, /23505|reused|复用|已有.*订单/, '咨询创建必须处理并发重复创建');
  assert.match(consultCreate, /paymentExpiresAt|payment_expires_at/, '咨询订单必须记录支付过期时间');
  assert.match(payCreate, /PAYMENT_EXPIRED|支付超时|expired/i, '支付超时必须有明确的关闭分支');
  assert.match(payCreate, /paymentExpiresAt/, '咨询支付必须使用统一支付期限');
  assert.match(payStatus, /PAYMENT_EXPIRED|支付超时|closed/, '支付状态查询必须关闭过期支付尝试');
  assert.match(consultCallback, /in\(['"]payment_status['"],\s*\[['"]pending['"],\s*['"]paying['"]\]/, '咨询回调不能重新激活已关闭订单');
  assert.match(lawyerPayCreate, /PAYMENT_TTL_MS/, '律师入驻必须使用统一支付期限');
  assert.match(renewCreate, /lawyer_renew_orders[\s\S]*pending.*paying/, '律师续费必须保留有效订单检查');
  assert.match(renewCreate, /PAYMENT_TTL_MS/, '律师续费必须使用统一支付期限');
  assert.match(lifecycle, /15 \* 60 \* 1000/, '统一支付期限必须为15分钟');
  assert.match(refundRoute, /payment_status\s*!==\s*['"]paid['"]|payment_status.*paid/, '退款接口必须只处理已支付订单');
  assert.match(refundRoute, /REFUND_WINDOW_MS/, '管理员直接退款接口必须执行24小时窗口');
  assert.match(refundRoute, /paidAt[\s\S]*REFUND_WINDOW_MS/, '管理员直接退款接口必须依据支付时间校验');
  assert.match(refundRoute, /refundOrder|退款.*微信|wechat.*refund/i, '退款接口必须调用真实微信退款能力');
  assert.match(wechatPay, /refund/i, '微信支付客户端必须提供退款方法');

  console.log('unified payment order safety contract test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
