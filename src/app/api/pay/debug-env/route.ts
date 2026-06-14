import { NextResponse } from 'next/server';
import { getEnvValue } from '@/lib/payment/wechat-pay';

/**
 * 调试端点：检查支付环境变量配置状态
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

    // 尝试初始化微信支付客户端并实际下单测试
    let clientError: string | null = null;
    try {
      const { getWechatPayClient } = await import('@/lib/payment/wechat-pay');
      const client = getWechatPayClient();
      envCheck.clientInit = 'OK - 微信支付客户端初始化成功';
      
      // 尝试实际调用一次下单（1分钱测试）
      try {
        const testResult = await client.createNativeOrder({
          outTradeNo: `DEBUG${Date.now()}`,
          description: '环境变量测试订单',
          amount: 1, // 1分
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
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message || String(e),
    }, { status: 500 });
  }
}
