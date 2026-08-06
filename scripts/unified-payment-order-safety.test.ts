import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = (file: string) => readFile(path.join(root, file), 'utf8');

async function main() {
  const [consultCreate, payCreate, payStatus, renewCreate, refundRoute, wechatPay] = await Promise.all([
    source('src/app/api/consult/create/route.ts'),
    source('src/app/api/pay/create/route.ts'),
    source('src/app/api/pay/status/route.ts'),
    source('src/app/api/lawyer/renew/route.ts'),
    source('src/app/api/admin/order/refund/route.ts'),
    source('src/lib/payment/wechat-pay.ts'),
  ]);

  assert.match(consultCreate, /payment_status.*pending.*paying|pending.*paying[\s\S]*consult_orders/, '咨询创建必须检查有效支付订单');
  assert.match(consultCreate, /23505|reused|复用|已有.*订单/, '咨询创建必须处理并发重复创建');
  assert.match(payCreate, /PAYMENT_EXPIRED|支付超时|expired/i, '支付超时必须有明确的关闭分支');
  assert.match(payStatus, /PAYMENT_EXPIRED|支付超时|closed/, '支付状态查询必须关闭过期支付尝试');
  assert.match(renewCreate, /lawyer_renew_orders[\s\S]*pending.*paying/, '律师续费必须保留有效订单检查');
  assert.match(refundRoute, /payment_status\s*!==\s*['"]paid['"]|payment_status.*paid/, '退款接口必须只处理已支付订单');
  assert.match(refundRoute, /refundOrder|退款.*微信|wechat.*refund/i, '退款接口必须调用真实微信退款能力');
  assert.match(wechatPay, /refund/i, '微信支付客户端必须提供退款方法');

  console.log('unified payment order safety contract test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
