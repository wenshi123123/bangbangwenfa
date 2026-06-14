/**
 * 微信支付工具库
 * 包含支付回调处理、订单状态更新、真实微信支付 API 对接等功能
 */

import crypto from 'crypto';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';

export interface PaymentCallbackResult {
  success: boolean;
  error?: string;
  order?: any;
}

/**
 * 处理微信支付回调，更新订单状态
 */
export async function updateOrderStatusAfterPayment(body: string): Promise<PaymentCallbackResult> {
  try {
    const data = JSON.parse(body);
    const { out_trade_no, transaction_id, trade_state } = data;

    if (trade_state !== 'SUCCESS') {
      return { success: false, error: '支付未成功' };
    }

    const supabase = getSupabaseAdmin();

    const { data: existingOrder } = await supabase
      .from('consult_orders')
      .select('payment_status, openid')
      .eq('order_no', out_trade_no)
      .single();

    if (!existingOrder) {
      return { success: false, error: '订单不存在' };
    }

    if (existingOrder.payment_status === 'paid') {
      console.log('订单已支付，跳过重复处理:', out_trade_no);
      return { 
        success: true, 
        order: { order_no: out_trade_no, openid: existingOrder.openid }
      };
    }

    const { error } = await supabase
      .from('consult_orders')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        wechat_transaction_id: transaction_id,
        updated_at: new Date().toISOString(),
      })
      .eq('order_no', out_trade_no);

    if (error) {
      console.error('更新订单失败:', error);
      return { success: false, error: '更新订单失败' };
    }

    console.log('支付成功，订单已更新:', out_trade_no);

    return { 
      success: true, 
      order: { 
        order_no: out_trade_no, 
        user_wechat_openid: existingOrder.openid
      }
    };
  } catch (err: any) {
    console.error('支付回调处理异常:', err);
    return { success: false, error: err.message || '处理异常' };
  }
}

// ==================== 微信支付签名与验签 ====================

function generateRequestSignature(
  method: string,
  url: string,
  timestamp: string,
  nonce: string,
  body: string,
  privateKey: string
): string {
  const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signStr);
  return sign.sign(privateKey, 'base64');
}

function generateAuthorizationHeader(
  mchId: string,
  serialNo: string,
  nonce: string,
  timestamp: string,
  signature: string
): string {
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",signature="${signature}",serial_no="${serialNo}",timestamp="${timestamp}"`;
}

export async function verifyWechatPaySignature(
  wechatpayTimestamp: string,
  wechatpayNonce: string,
  body: string,
  wechatpaySignature: string,
  wechatpaySerial: string
): Promise<{ valid: boolean; reason?: string }> {
  const signStr = `${wechatpayTimestamp}\n${wechatpayNonce}\n${body}\n`;

  try {
    const { getPlatformCertificate } = await import('./wechat-cert');
    const cert = await getPlatformCertificate(wechatpaySerial);

    if (!cert) {
      if (process.env.DEPLOY_ENV === 'PROD') {
        console.error('生产环境未配置微信平台证书，签名验证失败');
        return { valid: false, reason: '未配置平台证书，无法验证签名' };
      }
      console.warn('开发环境未获取到平台证书，签名验证失败');
      return { valid: false, reason: '未获取到平台证书' };
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signStr);
    const isValid = verifier.verify(cert, wechatpaySignature, 'base64');

    if (!isValid) {
      console.error('微信支付回调签名验证失败');
      return { valid: false, reason: '签名不匹配' };
    }

    return { valid: true };
  } catch (error) {
    console.error('签名验证异常:', error);
    return { valid: false, reason: '验证异常' };
  }
}

// ==================== 微信支付客户端 ====================

interface WechatPayConfig {
  appId: string;
  mchId: string;
  serialNo: string;
  apiV3Key: string;
  privateKey: string;
}

interface CreateNativeOrderParams {
  outTradeNo: string;
  description: string;
  amount: number;
  notifyUrl: string;
}

interface CreateNativeOrderResult {
  prepayId: string;
  codeUrl: string;
}

interface CreateH5OrderParams {
  outTradeNo: string;
  description: string;
  amount: number;
  notifyUrl: string;
  clientIp: string;
}

interface CreateH5OrderResult {
  prepayId: string;
  h5Url: string;
}

class WechatPayClient {
  private config: WechatPayConfig;
  private baseUrl = 'https://api.mch.weixin.qq.com';

  constructor(config: WechatPayConfig) {
    this.config = config;
  }

  private getPrivateKey(): string {
    let key = this.config.privateKey || getEnvValue('WEIXIN_PRIVATE_KEY');
    if (!key) {
      throw new Error('微信支付商户私钥未配置，请设置 WEIXIN_PRIVATE_KEY 环境变量');
    }
    return normalizePem(key, 'PRIVATE KEY');
  }

  private async createOrder(
    urlPath: string,
    payload: Record<string, any>
  ): Promise<any> {
    const privateKey = this.getPrivateKey();
    const bodyStr = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const signature = generateRequestSignature(
      'POST', urlPath, timestamp, nonce, bodyStr, privateKey
    );

    const authorization = generateAuthorizationHeader(
      this.config.mchId, this.config.serialNo, nonce, timestamp, signature
    );

    const response = await fetch(`${this.baseUrl}${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authorization,
        'User-Agent': 'BBWF/1.0',
      },
      body: bodyStr,
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errMsg = responseData?.message || '未知错误';
      const errCode = responseData?.code || 'UNKNOWN';
      console.error('微信支付下单失败:', { code: errCode, message: errMsg, status: response.status });
      throw new Error(`微信支付下单失败: [${errCode}] ${errMsg}`);
    }

    return responseData;
  }

  /**
   * 创建 Native 支付订单（扫码支付）
   */
  async createNativeOrder(params: CreateNativeOrderParams): Promise<CreateNativeOrderResult> {
    const { outTradeNo, description, amount, notifyUrl } = params;

    const responseData = await this.createOrder('/v3/pay/transactions/native', {
      appid: this.config.appId,
      mchid: this.config.mchId,
      description,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: { total: amount, currency: 'CNY' },
    });

    return {
      prepayId: responseData.prepay_id || '',
      codeUrl: responseData.code_url || '',
    };
  }

  /**
   * 创建 H5 支付订单（手机浏览器跳转微信支付）
   * 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_3_1.shtml
   */
  async createH5Order(params: CreateH5OrderParams): Promise<CreateH5OrderResult> {
    const { outTradeNo, description, amount, notifyUrl, clientIp } = params;

    const responseData = await this.createOrder('/v3/pay/transactions/h5', {
      appid: this.config.appId,
      mchid: this.config.mchId,
      description,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: { total: amount, currency: 'CNY' },
      scene_info: {
        payer_client_ip: clientIp,
        h5_info: {
          type: 'Wap',
          app_name: '帮帮问法',
          app_url: 'https://bangbangwenfa.com',
        },
      },
    });

    return {
      prepayId: responseData.prepay_id || '',
      h5Url: responseData.h5_url || '',
    };
  }
}

export function getWechatPayClient(): WechatPayClient {
  const config: WechatPayConfig = {
    appId: process.env.WEIXIN_APPID || '',
    mchId: process.env.WEIXIN_MCHID || '',
    serialNo: process.env.WEIXIN_SERIAL_NO || '',
    apiV3Key: process.env.WEIXIN_APIV3_KEY || '',
    privateKey: process.env.WEIXIN_PRIVATE_KEY || '',
  };

  if (!config.appId || !config.mchId) {
    console.warn('微信支付配置不完整，请检查 WEIXIN_APPID 和 WEIXIN_MCHID 环境变量');
  }
  if (!config.serialNo || !config.apiV3Key) {
    console.warn('微信支付安全配置不完整，请检查 WEIXIN_SERIAL_NO 和 WEIXIN_APIV3_KEY 环境变量');
  }

  return new WechatPayClient(config);
}

// ==================== PEM 工具函数 ====================

export function getEnvValue(mainKey: string): string {
  const main = process.env[mainKey] || '';
  if (main) return main;

  const filePath = process.env[`${mainKey}_FILE`];
  if (filePath) {
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (e) {
      console.warn(`无法读取环境变量文件 ${filePath}:`, e);
    }
  }

  const parts: string[] = [];
  for (let i = 1; i <= 9; i++) {
    const part = process.env[`${mainKey}_PART${i}`];
    if (part) parts.push(part);
  }
  return parts.join('');
}

export function normalizePem(input: string, type: 'PRIVATE KEY' | 'CERTIFICATE'): string {
  if (!input) return input;

  let pem = input.replace(/\\n/g, '\n');

  const beginRegex = /-----BEGIN\\s+[\\w\\s]+-----/;
  const endRegex = /-----END\\s+[\\w\\s]+-----/;

  const beginMatch = pem.match(beginRegex);
  const endMatch = pem.match(endRegex);

  if (beginMatch && endMatch && beginMatch.index !== undefined && endMatch.index !== undefined) {
    const start = beginMatch.index + beginMatch[0].length;
    const end = endMatch.index;
    const base64Content = pem.slice(start, end).replace(/\s+/g, '');
    return `${beginMatch[0]}\n${base64Content}\n${endMatch[0]}`;
  }

  const cleanContent = pem.replace(/\s+/g, '');
  return `-----BEGIN ${type}-----\n${cleanContent}\n-----END ${type}-----`;
}
