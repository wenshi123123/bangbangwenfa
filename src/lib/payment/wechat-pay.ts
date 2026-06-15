/**
 * 微信支付 API v3 封装
 * 支持 Native 支付（扫码支付）和 H5 支付（手机浏览器跳转）
 */

import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
  /** 商品描述（可选） */
  goodsDescription?: string;
}

interface CreateH5OrderResult {
  h5Url: string;
  prepayId?: string;
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
    const appId = process.env.WECHAT_PAY_APP_ID || '';
    const mchId = process.env.WECHAT_PAY_MCH_ID || '';
    const serialNo = process.env.WECHAT_PAY_SERIAL_NO || '';
    const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY || '';

    // 从文件读取私钥
    let privateKey = '';
    const keyPath = process.env.WECHAT_PAY_PRIVATE_KEY_PATH;
    if (keyPath && fs.existsSync(keyPath)) {
      privateKey = fs.readFileSync(keyPath, 'utf8');
    } else {
      // 尝试从环境变量直接读取
      privateKey = process.env.WECHAT_PAY_PRIVATE_KEY || '';
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
    return this.config.privateKey.replace(/\\n/g, '\n');
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

    // 打印签名信息
    console.log('[WechatPay] 签名信息:', {
      method: 'POST',
      urlPath,
      timestamp,
      nonce,
      bodyStr,
      privateKeyLength: privateKey.length,
      privateKeyPreview: privateKey.substring(0, 50) + '...',
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

    console.log('[WechatPay] Authorization:', authorization.substring(0, 100) + '...');

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
    const { outTradeNo, description, amount, notifyUrl, clientIp } = params;
    const privateKey = this.getPrivateKey();

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
  QueryOrderResult,
  CloseOrderResult,
};
