/**
 * 微信支付 API v3 封装
 * 支持 Native 支付（扫码支付）和 H5 支付（手机浏览器跳转）
 */

import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getSiteUrl } from '@/lib/site';

// ===== 微信支付配置类型 =====

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
  amount: number; // 单位：分
  notifyUrl: string;
  /** 商品描述（可选，用于更详细的描述） */
  goodsDescription?: string;
}

interface CreateNativeOrderResult {
  codeUrl: string;
  prepayId?: string;
}

interface CreateH5OrderParams {
  outTradeNo: string;
  description: string;
  amount: number; // 单位：分
  notifyUrl: string;
  /** 客户端 IP 地址 */
  clientIp: string;
  /** 微信商户平台已审核的 H5 应用域名 */
  appUrl?: string;
  /** 商品描述（可选） */
  goodsDescription?: string;
}

interface CreateH5OrderResult {
  h5Url: string;
  prepayId?: string;
}

interface CreateJsapiOrderParams {
  outTradeNo: string;
  description: string;
  amount: number; // 单位：分
  notifyUrl: string;
  payerOpenid: string;
  goodsDescription?: string;
}

interface CreateJsapiOrderResult {
  prepayId: string;
  payParams: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: 'RSA';
    paySign: string;
  };
}

interface QueryOrderResult {
  tradeState: string;
  tradeStateDesc: string;
  transactionId?: string;
  payerOpenid?: string;
  amount?: {
    total: number;
    currency: string;
  };
}

interface CloseOrderResult {
  success: boolean;
}

// ===== 签名工具函数 =====

/**
 * 生成请求签名（SHA256 with RSA）
 * 签名串格式: HTTP请求方法\nURL路径\n时间戳\n随机串\n请求体\n
 */
function generateRequestSignature(
  method: string,
  urlPath: string,
  timestamp: string,
  nonce: string,
  body: string,
  privateKey: string
): string {
  const signStr = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signStr);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

/**
 * 生成 Authorization 头
 * 格式: WECHATPAY2-SHA256-RSA2048 mchid="商户号",nonce_str="随机串",timestamp="时间戳",serial_no="证书序列号",signature="签名"
 */
function generateAuthorizationHeader(
  mchId: string,
  serialNo: string,
  timestamp: string,
  nonce: string,
  signature: string
): string {
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
}

function generateJsapiPayParams(
  appId: string,
  prepayId: string,
  privateKey: string
): CreateJsapiOrderResult['payParams'] {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const packageValue = `prepay_id=${prepayId}`;
  const signStr = `${appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signStr);
  sign.end();

  return {
    appId,
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign: sign.sign(privateKey, 'base64'),
  };
}

/**
 * 验证微信支付回调签名
 */
function verifyCallbackSignature(
  body: string,
  signature: string,
  timestamp: string,
  nonce: string,
  publicKey: string
): boolean {
  const signStr = `${timestamp}\n${nonce}\n${body}\n`;
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(signStr);
  verify.end();
  return verify.verify(publicKey, signature, 'base64');
}

// ===== PEM 工具函数 =====

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

// ===== 支付回调处理 =====

export interface PaymentCallbackResult {
  success: boolean;
  error?: string;
  order?: any;
}

function decryptCallbackResource(
  ciphertext: string,
  associatedData: string,
  nonce: string,
  apiV3Key: string
): string {
  const key = Buffer.from(apiV3Key, 'utf8');
  const iv = Buffer.from(nonce, 'utf8');
  const authTag = Buffer.from(ciphertext.slice(-16), 'base64');
  const data = Buffer.from(ciphertext.slice(0, -16), 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));

  let decrypted = decipher.update(data, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 处理微信支付回调，更新订单状态
 * @param body 回调请求体
 * @returns 处理结果
 */
export async function updateOrderStatusAfterPayment(body: string): Promise<PaymentCallbackResult> {
  try {
    const rawData = JSON.parse(body);
    const apiV3Key = getEnvValue('WEIXIN_APIV3_KEY') || process.env.WECHAT_PAY_API_V3_KEY || process.env.WEIXIN_APIV3_KEY || '';

    let data: any;
    if (rawData.resource?.ciphertext) {
      if (!apiV3Key) {
        return { success: false, error: '未配置APIv3密钥' };
      }
      data = JSON.parse(
        decryptCallbackResource(
          rawData.resource.ciphertext,
          rawData.resource.associated_data || '',
          rawData.resource.nonce || '',
          apiV3Key
        )
      );
    } else {
      data = rawData;
    }

    const { out_trade_no, transaction_id, trade_state } = data;

    // 验证支付状态
    if (trade_state !== 'SUCCESS') {
      return { success: false, error: '支付未成功' };
    }

    const supabase = getSupabaseAdmin();

    // 查询当前订单状态，避免重复处理
    // 兼容新旧两种订单号字段：
    // - 新链路使用 pay_trade_no
    // - 老链路可能写入 order_no
    const { data: existingOrder, error: queryError } = await supabase
      .from('consult_orders')
      .select('id, payment_status, openid, pay_trade_no, order_no')
      .or(`pay_trade_no.eq.${out_trade_no},order_no.eq.${out_trade_no}`)
      .maybeSingle();

    if (queryError) {
      console.error('查询支付订单失败:', queryError);
      return { success: false, error: '查询订单失败' };
    }

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
    const orderId = existingOrder.id;
    const orderNoField = existingOrder.pay_trade_no || existingOrder.order_no || out_trade_no;
    const { error } = await supabase
      .from('consult_orders')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        wechat_transaction_id: transaction_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error('更新订单失败:', error);
      return { success: false, error: '更新订单失败' };
    }

    console.log('支付成功，订单已更新:', { out_trade_no, orderId, orderNoField });

    // 返回订单信息用于后续推送
    return { 
      success: true, 
      order: { 
        order_no: orderNoField, 
        user_wechat_openid: existingOrder.openid
      }
    };

  } catch (err: any) {
    console.error('支付回调处理异常:', err);
    return { success: false, error: err.message || '处理异常' };
  }
}

// ===== 微信支付客户端类 =====

export class WechatPayClient {
  private config: WechatPayConfig;
  private baseUrl: string = 'https://api.mch.weixin.qq.com';

  constructor(config: WechatPayConfig) {
    this.config = config;
  }

  /**
   * 从环境变量创建客户端
   */
  static fromEnv(): WechatPayClient {
    const appId = getEnvValue('WEIXIN_APPID') || process.env.WECHAT_PAY_APP_ID || '';
    const mchId = getEnvValue('WEIXIN_MCHID') || process.env.WECHAT_PAY_MCH_ID || '';
    const serialNo = getEnvValue('WEIXIN_SERIAL_NO') || process.env.WECHAT_PAY_SERIAL_NO || '';
    const apiV3Key = getEnvValue('WEIXIN_APIV3_KEY') || process.env.WECHAT_PAY_API_V3_KEY || '';

    // 读取私钥
    let privateKey = '';
    const keyPath = process.env.WECHAT_PAY_PRIVATE_KEY_PATH;
    if (keyPath && fs.existsSync(keyPath)) {
      privateKey = fs.readFileSync(keyPath, 'utf8');
    } else {
      // 尝试从环境变量直接读取（支持分段）
      privateKey = getEnvValue('WEIXIN_PRIVATE_KEY') || process.env.WECHAT_PAY_PRIVATE_KEY || '';
    }

    if (!appId || !mchId || !serialNo || !apiV3Key || !privateKey) {
      throw new Error('微信支付配置不完整，请检查环境变量');
    }

    return new WechatPayClient({
      appId,
      mchId,
      serialNo,
      apiV3Key,
      privateKey,
    });
  }

  /**
   * 获取私钥（处理环境变量中的换行符）
   */
  private getPrivateKey(): string {
    return normalizePem(this.config.privateKey, 'PRIVATE KEY');
  }

  /**
   * 发送签名请求
   */
  private async signedRequest(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    urlPath: string,
    body?: Record<string, unknown>
  ): Promise<any> {
    const privateKey = this.getPrivateKey();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const bodyStr = body ? JSON.stringify(body) : '';

    const signature = generateRequestSignature(
      method,
      urlPath,
      timestamp,
      nonce,
      bodyStr,
      privateKey
    );

    const authorization = generateAuthorizationHeader(
      this.config.mchId,
      this.config.serialNo,
      timestamp,
      nonce,
      signature
    );

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${urlPath}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
          'Wechatpay-Serial': this.config.serialNo,
        },
        data: bodyStr || undefined,
        timeout: 30000,
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errData = error.response.data;
        console.error('[WechatPay] API 错误:', JSON.stringify(errData, null, 2));
        throw new Error(
          `微信支付 API 错误: ${errData?.message || errData?.code || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 创建 Native 支付订单（扫码支付）
   * 文档: https://pay.weixin.qq.com/doc/v3/apis/chapter3_4_1.shtml
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

    // 【诊断日志】打印关键参数，排查 PARAM_ERROR
    console.log('[WechatPay] 下单参数:', {
      appid: this.config.appId,
      mchid: this.config.mchId,
      serialNo: this.config.serialNo,
      outTradeNo,
      amount,
      description,
      notifyUrl,
    });

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
      timestamp,
      nonce,
      signature
    );

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}${urlPath}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
          'Wechatpay-Serial': this.config.serialNo,
        },
        data: bodyStr,
        timeout: 30000,
      });

      console.log('[WechatPay] Native下单成功:', {
        prepay_id: response.data?.prepay_id,
        code_url: response.data?.code_url,
      });

      return {
        codeUrl: response.data.code_url,
        prepayId: response.data.prepay_id,
      };
    } catch (error: any) {
      if (error.response) {
        console.error('[WechatPay] Native下单失败 - 响应状态:', error.response.status);
        console.error('[WechatPay] Native下单失败 - 响应头:', JSON.stringify(error.response.headers, null, 2));
        console.error('[WechatPay] Native下单失败 - 响应体:', JSON.stringify(error.response.data, null, 2));
        const errData = error.response.data;
        throw new Error(
          `微信支付 Native 下单失败 [${errData?.code || 'UNKNOWN'}]: ${errData?.message || error.message}`
        );
      }
      console.error('[WechatPay] Native下单失败 - 网络错误:', error.message);
      throw error;
    }
  }

  /**
   * 创建 H5 支付订单（手机浏览器跳转微信支付）
   * 文档: https://pay.weixin.qq.com/doc/v3/apis/chapter3_4_3.shtml
   */
  async createH5Order(params: CreateH5OrderParams): Promise<CreateH5OrderResult> {
    const { outTradeNo, description, amount, notifyUrl, clientIp, appUrl } = params;
    const privateKey = this.getPrivateKey();
    const siteUrl = getSiteUrl();

    // 构建请求体（H5 支付必须包含 scene_info 和 payer_client_ip）
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
      scene_info: {
        payer_client_ip: clientIp,
        h5_info: {
          type: 'Wap',
          // 补充来源信息，提升 H5 场景兼容性
          app_name: '帮帮问法',
          app_url: appUrl || siteUrl,
        },
      },
    };

    const bodyStr = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const urlPath = '/v3/pay/transactions/h5';

    console.log('[WechatPay] H5下单参数:', {
      appid: this.config.appId,
      mchid: this.config.mchId,
      outTradeNo,
      amount,
      clientIp,
      notifyUrl,
    });

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
      timestamp,
      nonce,
      signature
    );

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}${urlPath}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
          'Wechatpay-Serial': this.config.serialNo,
        },
        data: bodyStr,
        timeout: 30000,
      });

      console.log('[WechatPay] H5下单成功:', {
        h5_url: response.data?.h5_url,
        prepay_id: response.data?.prepay_id,
      });

      return {
        h5Url: response.data.h5_url,
        prepayId: response.data.prepay_id,
      };
    } catch (error: any) {
      if (error.response) {
        console.error('[WechatPay] H5下单失败 - 响应状态:', error.response.status);
        console.error('[WechatPay] H5下单失败 - 响应体:', JSON.stringify(error.response.data, null, 2));
        const errData = error.response.data;
        throw new Error(
          `微信支付 H5 下单失败 [${errData?.code || 'UNKNOWN'}]: ${errData?.message || error.message}`
        );
      }
      console.error('[WechatPay] H5下单失败 - 网络错误:', error.message);
      throw error;
    }
  }

  /**
   * 创建 JSAPI 支付订单（微信内网页拉起支付）
   * 文档: https://pay.weixin.qq.com/doc/v3/apis/chapter3_4_2.shtml
   */
  async createJsapiOrder(params: CreateJsapiOrderParams): Promise<CreateJsapiOrderResult> {
    const { outTradeNo, description, amount, notifyUrl, payerOpenid } = params;
    const privateKey = this.getPrivateKey();

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
      payer: {
        openid: payerOpenid,
      },
    };

    const bodyStr = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const urlPath = '/v3/pay/transactions/jsapi';

    console.log('[WechatPay] JSAPI下单参数:', {
      appid: this.config.appId,
      mchid: this.config.mchId,
      outTradeNo,
      amount,
      notifyUrl,
      hasOpenid: !!payerOpenid,
    });

    const signature = generateRequestSignature(
      'POST',
      urlPath,
      timestamp,
      nonce,
      bodyStr,
      privateKey
    );

    const authorization = generateAuthorizationHeader(
      this.config.mchId,
      this.config.serialNo,
      timestamp,
      nonce,
      signature
    );

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}${urlPath}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
          'Wechatpay-Serial': this.config.serialNo,
        },
        data: bodyStr,
        timeout: 30000,
      });

      const prepayId = response.data?.prepay_id;
      if (!prepayId) {
        throw new Error('微信支付 JSAPI 下单成功但缺少 prepay_id');
      }

      return {
        prepayId,
        payParams: generateJsapiPayParams(this.config.appId, prepayId, privateKey),
      };
    } catch (error: any) {
      if (error.response) {
        console.error('[WechatPay] JSAPI下单失败 - 响应状态:', error.response.status);
        console.error('[WechatPay] JSAPI下单失败 - 响应体:', JSON.stringify(error.response.data, null, 2));
        const errData = error.response.data;
        throw new Error(
          `微信支付 JSAPI 下单失败 [${errData?.code || 'UNKNOWN'}]: ${errData?.message || error.message}`
        );
      }
      console.error('[WechatPay] JSAPI下单失败 - 网络错误:', error.message);
      throw error;
    }
  }

  /**
   * 查询订单状态
   * 文档: https://pay.weixin.qq.com/doc/v3/apis/chapter3_4_2.shtml
   */
  async queryOrder(outTradeNo: string): Promise<QueryOrderResult> {
    const urlPath = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.config.mchId}`;
    const data = await this.signedRequest('GET', urlPath);

    return {
      tradeState: data.trade_state,
      tradeStateDesc: data.trade_state_desc,
      transactionId: data.transaction_id,
      payerOpenid: data.payer?.openid,
      amount: data.amount
        ? {
            total: data.amount.total,
            currency: data.amount.currency,
          }
        : undefined,
    };
  }

  /**
   * 关闭订单
   * 文档: https://pay.weixin.qq.com/doc/v3/apis/chapter3_4_4.shtml
   */
  async closeOrder(outTradeNo: string): Promise<CloseOrderResult> {
    const urlPath = `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`;
    const body = {
      mchid: this.config.mchId,
    };
    await this.signedRequest('POST', urlPath, body);
    return { success: true };
  }

  /**
   * 验证回调通知签名
   */
  verifyNotifySignature(
    body: string,
    signature: string,
    timestamp: string,
    nonce: string
  ): boolean {
    // 微信支付平台证书公钥（从微信商户平台下载）
    // 注意：生产环境需要动态获取和管理平台证书
    const publicKeyPath = process.env.WECHAT_PAY_PLATFORM_CERT_PATH;
    let publicKey = '';
    if (publicKeyPath && fs.existsSync(publicKeyPath)) {
      publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    } else {
      // 如果没有平台证书，跳过签名验证（仅开发环境）
      console.warn('[WechatPay] 未配置平台证书，跳过回调签名验证');
      return true;
    }

    return verifyCallbackSignature(body, signature, timestamp, nonce, publicKey);
  }
}

// ===== 单例实例 =====

let clientInstance: WechatPayClient | null = null;

/**
 * 获取微信支付客户端单例
 */
export function getWechatPayClient(): WechatPayClient {
  if (!clientInstance) {
    clientInstance = WechatPayClient.fromEnv();
  }
  return clientInstance;
}

/**
 * 重置客户端（测试用）
 */
export function resetWechatPayClient(): void {
  clientInstance = null;
}

export type {
  WechatPayConfig,
  CreateNativeOrderParams,
  CreateNativeOrderResult,
  CreateH5OrderParams,
  CreateH5OrderResult,
  CreateJsapiOrderParams,
  CreateJsapiOrderResult,
  QueryOrderResult,
  CloseOrderResult,
};
