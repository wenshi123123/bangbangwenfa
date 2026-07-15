export type WechatWebPayFlow = 'oauth' | 'jsapi' | 'h5' | 'native';

export function resolveWechatWebPayFlow(params: {
  isWechat: boolean;
  isMobile: boolean;
  hasOpenid: boolean;
}): WechatWebPayFlow {
  const { isWechat, isMobile, hasOpenid } = params;

  if (isWechat) {
    return hasOpenid ? 'jsapi' : 'oauth';
  }

  if (isMobile) {
    return 'h5';
  }

  return 'native';
}

export function buildWechatOauthRedirectPath(redirectPath: string): string {
  return `/api/wechat/oauth/authorize?redirect=${encodeURIComponent(redirectPath)}`;
}
