import assert from 'node:assert/strict';
import {
  buildWechatOauthRedirectPath,
  resolveWechatWebPayFlow,
} from '../src/lib/payment/wechat-web';

assert.equal(
  resolveWechatWebPayFlow({ isWechat: true, isMobile: true, hasOpenid: false }),
  'oauth',
  '微信内缺少 openid 时应先走 OAuth'
);

assert.equal(
  resolveWechatWebPayFlow({ isWechat: true, isMobile: true, hasOpenid: true }),
  'jsapi',
  '微信内拿到 openid 后应走 JSAPI'
);

assert.equal(
  resolveWechatWebPayFlow({ isWechat: false, isMobile: true, hasOpenid: false }),
  'h5',
  '普通手机浏览器应走 H5'
);

assert.equal(
  resolveWechatWebPayFlow({ isWechat: false, isMobile: false, hasOpenid: false }),
  'native',
  'PC 端应走 Native'
);

assert.equal(
  buildWechatOauthRedirectPath('/pay?orderId=67'),
  '/api/wechat/oauth/authorize?redirect=%2Fpay%3ForderId%3D67'
);

console.log('wechat web payment flow test passed');
