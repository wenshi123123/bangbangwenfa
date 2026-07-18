import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const source = (file: string) => readFile(path.join(process.cwd(), file), 'utf8');

async function main() {
  const [wechatPay, consultCreate, lawyerCreate, consultPay, lawyerPay, guide] = await Promise.all([
    source('src/lib/payment/wechat-pay.ts'),
    source('src/app/api/pay/create/route.ts'),
    source('src/app/api/lawyer/pay/create/route.ts'),
    source('src/app/pay/page.tsx'),
    source('src/app/lawyer/pay/page.tsx'),
    source('src/components/payment/wechat-external-browser-guide.tsx'),
  ]);

  assert.match(wechatPay, /getWechatPayClient\(options\?: \{ appId\?: string \}\)/, '支付客户端必须允许 JSAPI 使用公众号 AppID');
  for (const route of [consultCreate, lawyerCreate]) {
    assert.match(route, /process\.env\.WEIXIN_OA_APPID/, '微信内 JSAPI 必须使用公众号 AppID');
    assert.match(route, /WECHAT_JSAPI_CONFIG_ERROR/, '微信内配置失败必须返回可识别的兜底错误码');
  }
  for (const page of [consultPay, lawyerPay]) {
    assert.match(page, /WechatExternalBrowserGuide/, '微信内付款页必须展示浏览器外支付引导');
    assert.match(page, /if \(deviceReady && isWechat\)/, '微信内付款页必须在创建支付前展示引导');
  }
  assert.match(guide, /复制支付链接/, '引导必须让用户能复制当前支付链接');
  assert.match(guide, /在浏览器打开/, '引导必须明确告诉用户如何离开微信完成支付');
  console.log('wechat external browser payment guidance test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
