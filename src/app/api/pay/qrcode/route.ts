import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * 生成微信支付二维码图片
 * GET /api/pay/qrcode?codeUrl=xxx
 * 
 * 将 weixin:// 协议转换为可扫码的二维码
 */
export async function GET(request: NextRequest) {
  try {
    // 限流检查
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`${clientIP}:qrcode`, 20, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '请求过于频繁' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const codeUrl = searchParams.get('codeUrl');

    if (!codeUrl) {
      return NextResponse.json(
        { success: false, error: '缺少 codeUrl 参数' },
        { status: 400 }
      );
    }

    // 生成二维码图片（PNG 格式，Base64 编码）
    const qrCodeDataUrl = await QRCode.toDataURL(codeUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: qrCodeDataUrl
      }
    });
  } catch (error) {
    console.error('生成二维码失败:', error);
    return NextResponse.json(
      { success: false, error: '生成二维码失败' },
      { status: 500 }
    );
  }
}
