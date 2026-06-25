import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const oaAppId = process.env.WEIXIN_OA_APPID;
  const oaSecret = process.env.WEIXIN_OA_APPSECRET;

  if (!oaAppId || !oaSecret) {
    return NextResponse.json(
      { success: false, error: '未配置微信公众号 OAuth 参数' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/pay';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bangbangwenfa.com';

  console.log('[WeChat OAuth Callback] incoming', {
    hasCode: !!code,
    redirect,
    ua: request.headers.get('user-agent') || '',
  });

  if (!code) {
    return NextResponse.json(
      { success: false, error: '缺少 code 参数' },
      { status: 400 }
    );
  }

  if (!redirect.startsWith('/')) {
    return NextResponse.json(
      { success: false, error: '无效的 redirect 参数' },
      { status: 400 }
    );
  }

  const tokenUrl =
    'https://api.weixin.qq.com/sns/oauth2/access_token' +
    `?appid=${encodeURIComponent(oaAppId)}` +
    `&secret=${encodeURIComponent(oaSecret)}` +
    `&code=${encodeURIComponent(code)}` +
    '&grant_type=authorization_code';

  const tokenRes = await fetch(tokenUrl, { method: 'GET' });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.errcode) {
    console.error('[WeChat OAuth Callback] token exchange failed', {
      redirect,
      errcode: tokenData.errcode,
      errmsg: tokenData.errmsg,
    });
    return NextResponse.json(
      { success: false, error: tokenData.errmsg || '获取 openid 失败' },
      { status: 500 }
    );
  }

  console.log('[WeChat OAuth Callback] token exchange success', {
    redirect,
    scope: tokenData.scope,
    openidLength: tokenData.openid ? String(tokenData.openid).length : 0,
    hasUnionid: !!tokenData.unionid,
  });

  const targetUrl = new URL(redirect, siteUrl);
  targetUrl.searchParams.set('oa_openid', tokenData.openid);
  targetUrl.searchParams.set('oa_oauth', '1');

  return NextResponse.redirect(targetUrl.toString(), 302);
}
