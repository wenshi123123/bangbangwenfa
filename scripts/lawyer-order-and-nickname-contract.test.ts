import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const source = (file: string) => readFile(path.join(process.cwd(), file), 'utf8');

async function main() {
  const [payPage, adminList, adminPage, consultCreate, lawyerCreate, lawyerCallback, lawyerStatus] = await Promise.all([
    source('src/app/lawyer/pay/page.tsx'),
    source('src/app/api/admin/order/list/route.ts'),
    source('src/app/admin/orders/page.tsx'),
    source('src/app/api/consult/create/route.ts'),
    source('src/app/api/lawyer/create/route.ts'),
    source('src/app/api/lawyer/pay/callback/route.ts'),
    source('src/app/api/lawyer/pay/status/route.ts'),
  ]);

  assert.match(payPage, /WechatExternalBrowserGuide/, '入驻付款页必须提供微信内外部浏览器引导');
  assert.match(payPage, /MicroMessenger/, '入驻付款页必须识别微信内浏览器');
  assert.match(payPage, /h5Url/, '入驻付款页必须支持移动 H5 支付跳转');

  assert.match(adminList, /lawyer_applications/, '后台订单接口必须合并律师入驻申请订单');
  assert.match(adminList, /order_type: 'lawyer_application'/, '后台订单接口必须标记律师入驻订单类型');
  assert.match(adminPage, /律师入驻订单/, '后台订单页必须显示律师入驻订单名称');
  assert.match(adminPage, /lawyer_application/, '后台订单页必须支持律师入驻订单详情入口');

  for (const [file, value] of [
    ['consult create', consultCreate],
    ['lawyer create', lawyerCreate],
    ['lawyer callback', lawyerCallback],
    ['lawyer status', lawyerStatus],
  ] as const) {
    assert.match(value, /resolveUserNickname/, `${file} 必须优先使用已登录用户 nickname`);
  }

  console.log('lawyer order and nickname contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
