import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const source = (file: string) => readFile(path.join(process.cwd(), file), 'utf8');

async function main() {
  const [wechatPay, consultCreate, lawyerCreate, consultPay, lawyerPay, guide, promo, styles] = await Promise.all([
    source('src/lib/payment/wechat-pay.ts'),
    source('src/app/api/pay/create/route.ts'),
    source('src/app/api/lawyer/pay/create/route.ts'),
    source('src/app/pay/page.tsx'),
    source('src/app/lawyer/pay/page.tsx'),
    source('src/components/payment/wechat-external-browser-guide.tsx'),
    source('src/components/lawyer/lawyer-promo-section.tsx'),
    source('src/app/globals.css'),
  ]);

  assert.match(wechatPay, /getWechatPayClient\(options\?: \{ appId\?: string \}\)/, '支付客户端必须允许 JSAPI 使用公众号 AppID');
  for (const route of [consultCreate, lawyerCreate]) {
    assert.match(route, /process\.env\.WEIXIN_OA_APPID/, '微信内 JSAPI 必须使用公众号 AppID');
    assert.match(route, /WECHAT_JSAPI_CONFIG_ERROR/, '微信内配置失败必须返回可识别的兜底错误码');
  }
  for (const page of [consultPay, lawyerPay]) {
    assert.match(page, /WechatExternalBrowserGuide/, '微信内支付配置失败必须展示浏览器外支付引导');
    assert.match(page, /WECHAT_JSAPI_CONFIG_ERROR/, '页面必须识别 JSAPI 配置失败错误码');
  }
  assert.match(guide, /复制支付链接/, '引导必须让用户能复制当前支付链接');
  assert.match(guide, /在浏览器打开/, '引导必须明确告诉用户如何离开微信完成支付');
  assert.match(promo, /export function LawyerPromoSection[\s\S]*lawyer-onboarding-theme/, '律师入驻首页必须使用和后续流程相同的主题');
  assert.doesNotMatch(styles, /\[class\*="bg-green-"\][\s\S]{0,80}background-color: #F5EDE5/, '不能把所有绿色背景都强制变浅，否则白字会看不清');
  assert.match(styles, /\.lawyer-onboarding-theme \.bg-green-500[\s\S]{0,100}#C47353/, '主要操作按钮必须保持深陶土底色');

  console.log('wechat jsapi fallback and lawyer theme test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
