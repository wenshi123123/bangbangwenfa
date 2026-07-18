import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = (file: string) => readFile(path.join(root, file), 'utf8');

async function main() {
  const [successPage, consultPayPage, lawyerPayPage, consultStatus, consultCreate, lawyerCreate] = await Promise.all([
    source('src/app/success/page.tsx'),
    source('src/app/pay/page.tsx'),
    source('src/app/lawyer/pay/page.tsx'),
    source('src/app/api/pay/status/route.ts'),
    source('src/app/api/pay/create/route.ts'),
    source('src/app/api/lawyer/pay/create/route.ts'),
  ]);

  assert.match(successPage, /api\/pay\/status/, '咨询回跳页必须核验微信支付状态');
  assert.match(successPage, /尚未完成支付/, '未付款回跳必须明确显示未完成支付');
  assert.match(successPage, /继续支付/, '未付款回跳必须提供继续支付入口');
  assert.match(successPage, /paymentConfirmed/, '成功页的成功内容必须受真实支付状态控制');

  assert.match(consultStatus, /orderId/, '咨询支付状态接口必须支持按业务订单号查询');
  assert.match(consultCreate, /payTradeNo/, '咨询 H5 回跳必须带上微信支付单号');
  assert.match(lawyerCreate, /applicationId/, '律师 H5 回跳必须带上申请 ID，未付款时才能继续支付');

  assert.match(consultPayPage, /前往微信支付/, '咨询外部手机浏览器必须由用户点击发起微信 H5 支付');
  assert.match(lawyerPayPage, /前往微信支付/, '律师外部手机浏览器必须由用户点击发起微信 H5 支付');
  assert.doesNotMatch(lawyerPayPage, /window\.location\.href = h5Url/, '律师支付不能在异步创建后自动唤起微信 H5');

  console.log('mobile payment result guard test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
