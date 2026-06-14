import { NextResponse } from 'next/server';
import { getEnvValue, normalizePem } from '@/lib/payment/wechat-pay';
import crypto from 'crypto';

/**
 * 调试端点：检查支付环境变量配置状态 + 签名诊断
 * GET /api/pay/debug-env
 * 
 * 仅用于排查问题，上线后请删除此文件！
 */
export async function GET() {
  try {
    const envCheck: Record<string, any> = {};

    // 检查各环境变量
    const vars = ['WEIXIN_APPID', 'WEIXIN_MCHID', 'WEIXIN_SERIAL_NO', 'WEIXIN_APIV3_KEY', 'WEIXIN_PRIVATE_KEY', 'DEPLOY_ENV'];

    for (const v of vars) {
      const direct = process.env[v] || '';
      const viaGetEnv = getEnvValue(v);

      // 检查 PART 变量
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

    // ==================== 签名诊断 ====================
    const signDiagnostic: Record<string, any> = {};

    try {
      const appId = getEnvValue('WEIXIN_APPID');
      const mchId = getEnvValue('WEIXIN_MCHID');
      const serialNo = getEnvValue('WEIXIN_SERIAL_NO');
      const apiV3Key = getEnvValue('WEIXIN_APIV3_KEY');
      const rawPrivateKey = getEnvValue('WEIXIN_PRIVATE_KEY');

      // 1. 私钥格式诊断
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

      // 2. normalizePem 后的格式
      const normalized = normalizePem(rawPrivateKey, 'PRIVATE KEY');
      signDiagnostic.normalizedKey = {
        length: normalized.length,
        header: normalized.substring(0, 50).replace(/\n/g, '\\n'),
        footer: normalized.substring(Math.max(0, normalized.length - 50)).replace(/\n/g, '\\n'),
        fullPreview: normalized.substring(0, 100).replace(/\n/g, '\\n') + '...' + normalized.substring(Math.max(0, normalized.length - 80)).replace(/\n/g, '\\n'),
      };

      // 3. 证书信息
      signDiagnostic.certInfo = {
        serialNo,
        serialNoLength: serialNo.length,
        mchId,
        appId,
        apiV3KeyPreview: apiV3Key ? apiV3Key.substring(0, 8) + '...' : '(空)',
      };

      // 4. 构建模拟签名请求
      const testBody = {
        appid: appId,
        mchid: mchId,
        description: '诊断测试-不会实际扣款',
        out_trade_no: `DIAG${Date.now().toString().slice(-8)}${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
        notify_url: 'https://bangbangwenfa.com/api/pay/callback',
        amount: { total: 1, currency: 'CNY' },
      };
      const testBodyStr = JSON.stringify(testBody);
      const testUrlPath = '/v3/pay/transactions/native';
      const testTimestamp = Math.floor(Date.now() / 1000).toString();
      const testNonce = crypto.randomBytes(16).toString('hex');
      const signStr = `POST\n${testUrlPath}\n${testTimestamp}\n${testNonce}\n${testBodyStr}\n`;

      signDiagnostic.signatureTest = {
        signString: signStr.replace(/\n/g, '\\n'),
        signStringHex: Buffer.from(signStr, 'utf-8').toString('hex').substring(0, 100) + '...',
        timestamp: testTimestamp,
        nonce: testNonce,
        method: 'POST',
        urlPath: testUrlPath,
        bodyJson: testBodyStr.substring(0, 200),
      };

      // 5. 尝试生成签名
      try {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signStr);
        const signature = sign.sign(normalized, 'base64');
        signDiagnostic.signatureTest.signSuccess = true;
        signDiagnostic.signatureTest.signatureLength = signature.length;
        signDiagnostic.signatureTest.signaturePreview = signature.substring(0, 30) + '...';

        // 构建完整 Authorization 头
        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${testNonce}",signature="${signature}",serial_no="${serialNo}",timestamp="${testTimestamp}"`;
        signDiagnostic.signatureTest.authorizationHeader = authorization.substring(0, 250) + '...';
      } catch (signErr: any) {
        signDiagnostic.signatureTest.signSuccess = false;
        signDiagnostic.signatureTest.signError = signErr.message || String(signErr);
      }

      // 6. 实际发送请求到微信 API（1分钱诊断测试）
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

        if (wxData?.detail) {
          signDiagnostic.realApiTest.detail = wxData.detail;
        }
      } catch (apiErr: any) {
        signDiagnostic.realApiTest = {
          error: apiErr.message || String(apiErr),
        };
      }

    } catch (diagErr: any) {
      signDiagnostic.error = diagErr.message || String(diagErr);
    }

    // ==================== 旧版测试（保留） ====================
    let clientError: string | null = null;
    try {
      const { getWechatPayClient } = await import('@/lib/payment/wechat-pay');
      const client = getWechatPayClient();
      envCheck.clientInit = 'OK - 微信支付客户端初始化成功';

      try {
        const testResult = await client.createNativeOrder({
          outTradeNo: `DEBUG${Date.now().toString().slice(-8)}${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
          description: '环境变量测试订单',
          amount: 1,
          notifyUrl: 'https://bangbangwenfa.com/api/pay/callback',
        });
        envCheck.testOrder = {
          success: true,
          codeUrl: testResult.codeUrl,
          prepayId: testResult.prepayId,
        };
      } catch (orderErr: any) {
        envCheck.testOrder = {
          success: false,
          error: orderErr?.message || String(orderErr),
        };
      }
    } catch (e: any) {
      clientError = e.message || String(e);
      envCheck.clientInit = `FAILED - ${clientError}`;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      signDiagnostic,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message || String(e),
    }, { status: 500 });
  }
}
