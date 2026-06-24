import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const oaAppId = process.env.WEIXIN_OA_APPID;
  if (!oaAppId) {
    return NextResponse.json(
      { success: false, error: '未配置微信公众号 AppID' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') || '/pay';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bangbangwenfa.com';

  if (!redirect.startsWith('/')) {
    return NextResponse.json(
      { success: false, error: '无效的 redirect 参数' },
      { status: 400 }
    );
  }

  const callbackUrl = `${siteUrl}/api/wechat/oauth/callback?redirect=${encodeURIComponent(redirect)}`;
  const oauthUrl =
    'https://open.weixin.qq.com/connect/oauth2/authorize' +
    `?appid=${encodeURIComponent(oaAppId)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    '&response_type=code' +
    '&scope=snsapi_base' +
    `&state=${encodeURIComponent(redirect)}` +
    '#wechat_redirect';

  return NextResponse.redirect(oauthUrl, 302);
}
