import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const source = (file: string) => readFile(path.join(process.cwd(), file), 'utf8');

function assertWechatPaymentGate(page: string, name: string) {
  assert.match(page, /WechatExternalBrowserGuide/, `${name}必须使用统一微信内付款引导`);
  assert.match(
    page,
    /if \(deviceReady && isWechat\) \{\s*return <WechatExternalBrowserGuide/,
    `${name}必须在微信内优先返回引导页`,
  );
  assert.match(
    page,
    /if \(isWechat\) return;/,
    `${name}必须在后台副作用中拦截微信内请求`,
  );
}

async function main() {
  const [guide, consultPay, lawyerPay, renewPay, lawyerLayout, priceStep, civilPriceStep, lawyerPackageStep, layout] = await Promise.all([
    source('src/components/payment/wechat-external-browser-guide.tsx'),
    source('src/app/pay/page.tsx'),
    source('src/app/lawyer/pay/page.tsx'),
    source('src/app/lawyer/renew/page.tsx'),
    source('src/app/lawyer/layout.tsx'),
    source('src/components/consult/price-step.tsx'),
    source('src/components/consult/civil-price-step.tsx'),
    source('src/components/lawyer/lawyer-package-step.tsx'),
    source('src/app/layout.tsx'),
  ]);

  assert.match(guide, /右上角“…”/, '引导必须明确微信右上角操作');
  assert.match(guide, /在浏览器打开/, '引导必须明确在浏览器打开');
  assert.match(guide, /为保障支付安全与订单信息完整，请在手机浏览器中完成支付/, '引导必须说明使用手机浏览器支付的正面理由');
  assert.doesNotMatch(guide, /微信内不提供支付入口/, '引导不能使用生硬的技术限制文案');
  assert.match(guide, /navigator\.clipboard\.writeText\(window\.location\.href\)/, '引导必须能复制当前付款链接');

  assertWechatPaymentGate(consultPay, '咨询付款页');
  assertWechatPaymentGate(lawyerPay, '律师入驻付款页');
  assertWechatPaymentGate(renewPay, '律师续费页');
  assert.match(lawyerLayout, /'\/lawyer\/pay'/, '律师入驻支付页不能在引导前被登录页重定向');
  assert.match(lawyerLayout, /'\/lawyer\/renew'/, '律师续费页不能在引导前被登录页重定向');
  assert.doesNotMatch(consultPay, /autoJsapiStarted/, '微信内付款页不得自动拉起 JSAPI');
  assert.match(priceStep, /window\.location\.assign\(`\/pay\?orderId=\$\{encodeURIComponent\(/, '刑事咨询必须使用真实地址跳转到支付页');
  assert.match(civilPriceStep, /window\.location\.assign\(`\/pay\?orderId=\$\{encodeURIComponent\(/, '民事咨询必须使用真实地址跳转到支付页');
  assert.match(lawyerPackageStep, /window\.location\.assign\(`\/lawyer\/pay\?applicationId=\$\{encodeURIComponent\(/, '律师入驻必须使用真实地址跳转到支付页');
  assert.match(layout, /pageshow/,'页面必须在最早阶段监听历史缓存恢复');
  assert.match(layout, /event\.persisted/, '页面必须只刷新历史缓存恢复的文档');
  assert.match(consultPay, /\/api\/pay\/handoff/, '微信内打开历史待支付订单时必须补发支付凭证');

  console.log('wechat external browser payment gate test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
