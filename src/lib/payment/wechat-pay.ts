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
 * @param body 回调请求体
 * @returns 处理结果
 */
export async function updateOrderStatusAfterPayment(body: string): Promise<PaymentCallbackResult> {
  try {
    const data = JSON.parse(body);
    const { out_trade_no, transaction_id, trade_state } = data;

    // 验证支付状态
    if (trade_state !== 'SUCCESS') {
      return { success: false, error: '支付未成功' };
    }

    const supabase = getSupabaseAdmin();

    // 查询当前订单状态，避免重复处理
    const { data: existingOrder } = await supabase
      .from('consult_orders')
      .select('payment_status, openid')
      .eq('order_no', out_trade_no)
      .single();

    if (!existingOrder) {
      return { success: false, error: '订单不存在' };
    }

    // 如果已经是已支付状态，跳过更新（幂等性）
    if (existingOrder.payment_status === 'paid') {
      console.log('订单已支付，跳过重复处理:', out_trade_no);
      return { 
        success: true, 
        order: { order_no: out_trade_no, openid: existingOrder.openid }
      };
    }

    // 更新订单状态
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

    // 返回订单信息用于后续推送
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

/**
 * 生成请求签名（商户私钥签名）
 */
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

/**
 * 生成 Authorization 请求头
 */
function generateAuthorizationHeader(
  mchId: string,
  serialNo: string,
  nonce: string,
  timestamp: string,
  signature: string
): string {
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",signature="${signature}",serial_no="${serialNo}",timestamp="${timestamp}"`;
}

/**
 * 验证微信支付回调签名
 * 使用微信平台证书验证签名，确保回调来自微信支付
 * @param wechatpayTimestamp 微信回调头 Wechatpay-Timestamp
 * @param wechatpayNonce 微信回调头 Wechatpay-Nonce
 * @param body 原始请求体字符串
 * @param wechatpaySignature 微信回调头 Wechatpay-Signature（从 Authorization 中提取）
 * @param wechatpaySerial 微信回调头 Wechatpay-Serial
 * @returns 验证结果
 */
export async function verifyWechatPaySignature(
  wechatpayTimestamp: string,
  wechatpayNonce: string,
  body: string,
  wechatpaySignature: string,
  wechatpaySerial: string
): Promise<{ valid: boolean; reason?: string }> {
  const signStr = `${wechatpayTimestamp}\n${wechatpayNonce}\n${body}\n`;

  try {
    // 尝试获取平台证书进行验签
    const { getPlatformCertificate } = await import('./wechat-cert');
    const cert = await getPlatformCertificate(wechatpaySerial);

    if (!cert) {
      // 生产环境：没有证书必须拒绝
      if (process.env.DEPLOY_ENV === 'PROD') {
        console.error('生产环境未配置微信平台证书，签名验证失败');
        return { valid: false, reason: '未配置平台证书，无法验证签名' };
      }
      // 开发环境：记录警告，但仍拒绝（安全优先）
      console.warn('开发环境未获取到平台证书，签名验证失败');
      return { valid: false, reason: '未获取到平台证书' };
    }

    // 使用平台证书验证签名
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

/**
 * 微信支付客户端类
 * 对接微信支付 APIv3 Native 下单接口
 */
class WechatPayClient {
  private config: WechatPayConfig;
  private baseUrl = 'https://api.mch.weixin.qq.com';

  constructor(config: WechatPayConfig) {
    this.config = config;
  }

  /**
   * 读取商户私钥
   * 支持分段环境变量（EdgeOne Pages 单变量限 1000 字符）
   */
  private getPrivateKey(): string {
    let key = this.config.privateKey || getEnvValue('WEIXIN_PRIVATE_KEY');

    if (!key) {
      throw new Error('微信支付商户私钥未配置，请设置 WEIXIN_PRIVATE_KEY 环境变量');
    }

    return normalizePem(key, 'PRIVATE KEY');
  }

  /**
   * 创建 Native 支付订单（扫码支付）
   * 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml
   */
  async createNativeOrder(params: CreateNativeOrderParams): Promise<CreateNativeOrderResult> {
    const { outTradeNo, description, amount, notifyUrl } = params;
    const privateKey = this.getPrivateKey();

    // 构建请求体
    const payload = {
      appid: this.config.appId,
      mchid: this.config.mchId,
      description,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: {
        total: amount,
        currency: 'CNY',
      },
    };

    const bodyStr = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const urlPath = '/v3/pay/transactions/native';

    // 生成签名
    const signature = generateRequestSignature(
      'POST',
      urlPath,
      timestamp,
      nonce,
      bodyStr,
      privateKey
    );

    // 生成 Authorization 头
    const authorization = generateAuthorizationHeader(
      this.config.mchId,
      this.config.serialNo,
      nonce,
      timestamp,
      signature
    );

    // 调用微信支付 API
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

    return {
      prepayId: responseData.prepay_id || '',
      codeUrl: responseData.code_url || '',
    };
  }
}

/**
 * 获取微信支付客户端实例
 */
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

/**
 * 读取支持分段的环境变量（EdgeOne Pages 单变量限 1000 字符）
 *
 * 当主变量 WEIXIN_XXX 内容超长时，可拆分为：
 *   WEIXIN_XXX_PART1 = 前 800 字符
 *   WEIXIN_XXX_PART2 = 剩余字符
 *   ...
 *   WEIXIN_XXX_PART9 = 最后部分
 *
 * 此函数会按顺序拼接所有分段。
 */
export function getEnvValue(mainKey: string): string {
  const main = process.env[mainKey] || '';
  if (main) return main;

  const parts: string[] = [];
  for (let i = 1; i <= 9; i++) {
    const part = process.env[`${mainKey}_PART${i}`];
    if (part) parts.push(part);
  }
  return parts.join('');
}

/**
 * 将 PEM 内容规范化为正确的 PEM 多行格式
 *
 * 支持各种输入格式：
 *   - 标准 PEM（含头尾和 Base64，可能含换行）
 *   - 纯 Base64 单行（无头尾）
 *   - 含 \n 转义的 PEM
 *   - 带有多余空白/格式错误的 PEM（如 -----BEGIN PRIVATE KEY---）
 *   - 分段存储的 PEM（跨 PART1~9 变量拼接）
 *
 * EdgeOne Pages 环境变量不能包含空白字符且单变量限 1000 字符，
 * 此函数负责还原为标准 PEM 格式供 crypto 模块使用。
 */
export function normalizePem(input: string, type: 'PRIVATE KEY' | 'CERTIFICATE'): string {
  if (!input) return input;

  // 1) 替换 \n 字面量（用户从 .env 文件复制时的转义序列）
  let pem = input.replace(/\\n/g, '\n');

  // 2) 查找 PEM 头尾标记（兼容各种变异写法）
  const beginRegex = /-----BEGIN\s+[\w\s]+-----/;
  const endRegex = /-----END\s+[\w\s]+-----/;

  const beginMatch = pem.match(beginRegex);
  const endMatch = pem.match(endRegex);

  if (beginMatch && endMatch && beginMatch.index !== undefined && endMatch.index !== undefined) {
    // 有头尾标记 → 提取中间 Base64 内容，移除所有空白，用标准格式重组
    const start = beginMatch.index + beginMatch[0].length;
    const end = endMatch.index;
    const base64Content = pem.slice(start, end).replace(/\s+/g, '');
    return `${beginMatch[0]}\n${base64Content}\n${endMatch[0]}`;
  }

  // 3) 没有头尾标记 → 移除所有空白，补充标准头尾
  const cleanContent = pem.replace(/\s+/g, '');
  return `-----BEGIN ${type}-----\n${cleanContent}\n-----END ${type}-----`;
}
