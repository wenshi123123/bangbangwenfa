import { NextRequest, NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/site';
import { isSafePaymentRedirect } from '@/lib/payment/payment-context';

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
  const siteUrl = getSiteUrl();

  if (!isSafePaymentRedirect(redirect)) {
    return NextResponse.json(
      { success: false, error: '无效的 redirect 参数' },
      { status: 400 }
    );
  }

  const callbackUrl = `${siteUrl}/api/wechat/oauth/callback`;
  const oauthUrl =
    'https://open.weixin.qq.com/connect/oauth2/authorize' +
    `?appid=${encodeURIComponent(oaAppId)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    '&response_type=code' +
    '&scope=snsapi_base' +
    `&state=${encodeURIComponent(redirect)}` +
    '#wechat_redirect';

  console.log('[WeChat OAuth Authorize]', {
    redirect,
    callbackUrl,
    ua: request.headers.get('user-agent') || '',
  });

  return NextResponse.redirect(oauthUrl, 302);
}
