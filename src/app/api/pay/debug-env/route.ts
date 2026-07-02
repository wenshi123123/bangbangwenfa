import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * 调试端点：检查支付环境变量配置状态 + 签名诊断 + 全路径对比测试
 * GET /api/pay/debug-env
 * 
 * 仅用于排查问题，上线后请删除此文件！
 */
export async function GET(request: Request) {
  const token = process.env.PAY_DEBUG_TOKEN;
  const requestToken = request.headers.get('x-debug-token');

  if (!token || requestToken !== token) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    const [{ getEnvValue, normalizePem, getWechatPayClient }, { getSiteUrl, normalizeCanonicalUrl }] =
      await Promise.all([
        import('@/lib/payment/wechat-pay'),
        import('@/lib/site'),
      ]);
    const siteUrl = getSiteUrl();
    const envCheck: Record<string, any> = {};

    const vars = ['WEIXIN_APPID', 'WEIXIN_MCHID', 'WEIXIN_SERIAL_NO', 'WEIXIN_APIV3_KEY', 'WEIXIN_PRIVATE_KEY', 'DEPLOY_ENV'];

    for (const v of vars) {
      const direct = process.env[v] || '';
      const viaGetEnv = getEnvValue(v);
      const parts: string[] = [];
      for (let i = 1; i <= 9; i++) {
        const partVal = process.env[`${v}_PART${i}`];
        if (partVal) parts.push(`PART${i}=${partVal.substring(0, 20)}...(${partVal.length}字符)`);
      }
      envCheck[v] = {
        directLength: direct.length,
        directPreview: direct ? direct.substring(0, 30) + '...' : '(空)',
        getEnvValueLength: viaGetEnv.length,
        getEnvValuePreview: viaGetEnv ? viaGetEnv.substring(0, 30) + '...' : '(空)',
        hasParts: parts.length > 0,
        parts: parts,
      };
    }

    const signDiagnostic: Record<string, any> = {};
    try {
      const appId = getEnvValue('WEIXIN_APPID');
      const mchId = getEnvValue('WEIXIN_MCHID');
      const serialNo = getEnvValue('WEIXIN_SERIAL_NO');
      const apiV3Key = getEnvValue('WEIXIN_APIV3_KEY');
      const rawPrivateKey = getEnvValue('WEIXIN_PRIVATE_KEY');

      signDiagnostic.privateKey = {
        totalLength: rawPrivateKey.length,
        firstLine: rawPrivateKey.substring(0, 50).replace(/\n/g, '\\n'),
        lastLine: rawPrivateKey.substring(Math.max(0, rawPrivateKey.length - 50)).replace(/\n/g, '\\n'),
        containsRSA: rawPrivateKey.includes('RSA PRIVATE KEY'),
        containsPKCS8: rawPrivateKey.includes('PRIVATE KEY') && !rawPrivateKey.includes('RSA'),
        containsBeginMarker: rawPrivateKey.includes('-----BEGIN'),
        containsEndMarker: rawPrivateKey.includes('-----END'),
        hasNewlines: rawPrivateKey.includes('\n'),
        hasEscapedNewlines: rawPrivateKey.includes('\\n'),
      };

      const normalized = normalizePem(rawPrivateKey, 'PRIVATE KEY');
      signDiagnostic.normalizedKey = {
        length: normalized.length,
        header: normalized.substring(0, 50).replace(/\n/g, '\\n'),
        footer: normalized.substring(Math.max(0, normalized.length - 50)).replace(/\n/g, '\\n'),
      };

      signDiagnostic.certInfo = {
        serialNo, serialNoLength: serialNo.length, mchId, appId,
        apiV3KeyPreview: apiV3Key ? apiV3Key.substring(0, 8) + '...' : '(空)',
      };

      const testBody = {
        appid: appId, mchid: mchId,
        description: '诊断测试-不会实际扣款',
        out_trade_no: `DIAG${Date.now().toString().slice(-8)}${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
        notify_url: `${siteUrl}/api/pay/callback`,
        amount: { total: 1, currency: 'CNY' },
      };
      const testBodyStr = JSON.stringify(testBody);
      const testUrlPath = '/v3/pay/transactions/native';
      const testTimestamp = Math.floor(Date.now() / 1000).toString();
      const testNonce = crypto.randomBytes(16).toString('hex');
      const signStr = `POST\n${testUrlPath}\n${testTimestamp}\n${testNonce}\n${testBodyStr}\n`;

      signDiagnostic.signatureTest = {
        signString: signStr.replace(/\n/g, '\\n'),
        timestamp: testTimestamp, nonce: testNonce,
        method: 'POST', urlPath: testUrlPath,
        bodyJson: testBodyStr.substring(0, 200),
      };

      try {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signStr);
        const signature = sign.sign(normalized, 'base64');
        signDiagnostic.signatureTest.signSuccess = true;
        signDiagnostic.signatureTest.signatureLength = signature.length;
        signDiagnostic.signatureTest.signaturePreview = signature.substring(0, 30) + '...';
      } catch (signErr: any) {
        signDiagnostic.signatureTest.signSuccess = false;
        signDiagnostic.signatureTest.signError = signErr.message || String(signErr);
      }

      try {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signStr);
        const signature = sign.sign(normalized, 'base64');
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${testNonce}",signature="${signature}",serial_no="${serialNo}",timestamp="${testTimestamp}"`;
        const wxResponse = await fetch('https://api.mch.weixin.qq.com' + testUrlPath, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authorization,
            'User-Agent': 'BBWF-DIAG/1.0',
          },
          body: testBodyStr,
        });
        const wxData = await wxResponse.json();
        signDiagnostic.realApiTest = {
          httpStatus: wxResponse.status,
          responseCode: wxData?.code || '(无)',
          responseMessage: wxData?.message || '(无)',
          fullResponse: JSON.stringify(wxData).substring(0, 800),
        };
        if (wxData?.detail) signDiagnostic.realApiTest.detail = wxData.detail;
      } catch (apiErr: any) {
        signDiagnostic.realApiTest = { error: apiErr.message || String(apiErr) };
      }
    } catch (diagErr: any) {
      signDiagnostic.error = diagErr.message || String(diagErr);
    }

    const fullPathTest: Record<string, any> = {};
    try {
      const client = getWechatPayClient();
      fullPathTest.clientInit = 'OK';

      try {
        const r1 = await client.createNativeOrder({
          outTradeNo: `DEBUG${Date.now().toString().slice(-8)}${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
          description: '环境变量测试订单', amount: 1,
          notifyUrl: `${siteUrl}/api/pay/callback`,
        });
        fullPathTest.test1_simpleOrder = { success: true, codeUrl: r1.codeUrl, prepayId: r1.prepayId };
      } catch (e: any) { fullPathTest.test1_simpleOrder = { success: false, error: e?.message || String(e) }; }

      try {
        const callbackUrl =
          normalizeCanonicalUrl(process.env.WEIXIN_CALLBACK_URL || '')?.toString().replace(/\/$/, '') ||
          `${siteUrl}/api/pay/callback`;
        const r2 = await client.createNativeOrder({
          outTradeNo: `WX${Date.now().toString().slice(-8)}${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
          description: '法律咨询服务 - 诊断测试订单', amount: 100,
          notifyUrl: callbackUrl,
        });
        fullPathTest.test2_consultPay = { success: true, codeUrl: r2.codeUrl, prepayId: r2.prepayId, callbackUrl_used: callbackUrl };
      } catch (e: any) { fullPathTest.test2_consultPay = { success: false, error: e?.message || String(e) }; }

      try {
        const r3 = await client.createNativeOrder({
          outTradeNo: `LAW${Date.now()}DIAG`, description: '律师入驻会员费 - 诊断测试',
          amount: 100, notifyUrl: `${siteUrl}/api/lawyer/pay/callback`,
        });
        fullPathTest.test3_lawyerPay = { success: true, codeUrl: r3.codeUrl, prepayId: r3.prepayId, notifyUrl_used: `${siteUrl}/api/lawyer/pay/callback` };
      } catch (e: any) { fullPathTest.test3_lawyerPay = { success: false, error: e?.message || String(e) }; }

      try {
        const r4 = await client.createNativeOrder({
          outTradeNo: `RENEW${Date.now()}DIAG`, description: '律师会员续费 - 诊断测试',
          amount: 100, notifyUrl: `${siteUrl}/api/lawyer/renew/callback`,
        });
        fullPathTest.test4_lawyerRenew = { success: true, codeUrl: r4.codeUrl, prepayId: r4.prepayId, notifyUrl_used: `${siteUrl}/api/lawyer/renew/callback` };
      } catch (e: any) { fullPathTest.test4_lawyerRenew = { success: false, error: e?.message || String(e) }; }
    } catch (e: any) { fullPathTest.clientInit = `FAILED - ${e.message || String(e)}`; }

    return NextResponse.json({
      success: true, timestamp: new Date().toISOString(),
      environment: envCheck, signDiagnostic, fullPathTest,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
  }
}
