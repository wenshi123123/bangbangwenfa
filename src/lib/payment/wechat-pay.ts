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
// verifyWechatPaySignature 统一由 wechat-cert.ts 提供
// 参数顺序: (signature, timestamp, nonce, body, serialNo)
export { verifyWechatPaySignature } from './wechat-cert';

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

/**
 * 微信支付客户端类
 * 对接微信支付 APIv3（Native / H5 / JSAPI）
 */
class WechatPayClient {
  private config: WechatPayConfig;
  private baseUrl = 'https://api.mch.weixin.qq.com';

  constructor(config: WechatPayConfig) {
    this.config = config;
  }

  /**
   * 读取商户私钥
   */
  private getPrivateKey(): string {
    // 优先使用构造时传入的值（已通过 getEnvValue 处理过分段）
    // 再尝试直接读取（兜底，支持 _FILE 方式等）
    let key = this.config.privateKey || getEnvValue('WEIXIN_PRIVATE_KEY');
    if (!key || key.trim() === '') {
      throw new Error('微信支付商户私钥未配置，请设置 WEIXIN_PRIVATE_KEY 环境变量（支持 PART1~PART9 分段）');
    }
    return normalizePem(key, 'PRIVATE KEY');
  }

  /**
   * 通用下单方法：构建签名并发送请求
   */
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
   * 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml
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

/**
 * 获取微信支付客户端实例
 */
export function getWechatPayClient(): WechatPayClient {
  const config: WechatPayConfig = {
    appId: process.env.WEIXIN_APPID || '',
    mchId: process.env.WEIXIN_MCHID || '',
    serialNo: process.env.WEIXIN_SERIAL_NO || '',
    apiV3Key: process.env.WEIXIN_APIV3_KEY || '',
    // 必须使用 getEnvValue 支持 PART1~PART9 分段拼接（CloudBase 单变量长度限制）
    privateKey: getEnvValue('WEIXIN_PRIVATE_KEY'),
  };

  const missing: string[] = [];
  if (!config.appId) missing.push('WEIXIN_APPID');
  if (!config.mchId) missing.push('WEIXIN_MCHID');
  if (!config.serialNo) missing.push('WEIXIN_SERIAL_NO');
  if (!config.apiV3Key) missing.push('WEIXIN_APIV3_KEY');
  if (!config.privateKey) missing.push('WEIXIN_PRIVATE_KEY（支持 PART1~PART9 分段）');

  if (missing.length > 0) {
    const msg = `微信支付配置不完整，缺少环境变量: ${missing.join(', ')}`;
    if (process.env.DEPLOY_ENV === 'PROD') {
      throw new Error(msg);
    }
    console.warn(msg);
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

  // 支持从文件读取（Docker 容器中长 PEM 密钥通过文件注入）
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
