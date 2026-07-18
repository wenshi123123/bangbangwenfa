import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = (file: string) => readFile(path.join(root, file), 'utf8');

async function main() {
  const [webhook, consultCreate, lawyerCreate, lawyerCallback, lawyerStatus, lawyerPayPage, successPage, homePage, lawyerLayout] = await Promise.all([
    source('src/lib/notify/webhook.ts'),
    source('src/app/api/consult/create/route.ts'),
    source('src/app/api/lawyer/create/route.ts'),
    source('src/app/api/lawyer/pay/callback/route.ts'),
    source('src/app/api/lawyer/pay/status/route.ts'),
    source('src/app/lawyer/pay/page.tsx'),
    source('src/app/success/page.tsx'),
    source('src/app/page.tsx'),
    source('src/app/lawyer/layout.tsx'),
  ]);

  assert.match(webhook, /phone\?: string/, '企业微信通知必须支持手机号');
  assert.match(webhook, /下单通知|支付成功通知/, '企业微信通知标题必须区分下单和支付成功');
  assert.match(webhook, /联系方式：/, '企业微信通知必须展示联系方式');
  assert.match(consultCreate, /phone: finalContactPhone/, '咨询下单通知必须传递手机号');
  assert.match(lawyerCreate, /phone,/, '律师入驻下单通知必须传递手机号');
  assert.match(lawyerCallback, /notifyOrder\(/, '律师支付成功后必须发送企业微信通知');
  assert.match(lawyerCallback, /status: 'Paid'/, '律师支付成功通知必须标记已支付');

  assert.match(lawyerStatus, /getWechatPayClient/, '律师状态接口必须能主动向微信查单');
  assert.match(lawyerStatus, /queryOrder\(application\.order_no\)/, '律师状态接口必须按商户订单号查单');
  assert.match(lawyerStatus, /payment_status: 'paid'/, '查单成功必须回写律师申请为已支付');
  assert.match(lawyerStatus, /notifyOrder\(/, '查单补偿成功后也必须发送支付成功通知');
  assert.match(lawyerPayPage, /支付结果确认中/, '微信内支付成功后必须提示正在确认，而不是卡住');
  assert.match(successPage, /api\/lawyer\/pay\/status/, '律师 H5 回跳成功页必须核验支付状态');
  assert.match(successPage, /尚未完成支付/, '律师 H5 回跳未确认时必须明确显示尚未完成支付');

  assert.doesNotMatch(homePage, /首页真实场景图集|真实图片/, '首页轮播不应再显示多余图集文案');
  assert.doesNotMatch(lawyerLayout, />加载中\.\.\.</, '律师工作台切页不应显示整页加载中文字');
  assert.match(lawyerPayPage, /lawyer-onboarding-theme/, '律师支付页必须使用工作台同款主题');
  assert.match(await source('src/components/lawyer/lawyer-join-wizard.tsx'), /lawyer-onboarding-theme/, '律师入驻流程必须使用工作台同款主题');

  console.log('lawyer onboarding completion test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
