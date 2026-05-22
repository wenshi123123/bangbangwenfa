/**
 * 火山云短信服务
 * 文档: https://www.volcengine.com/docs/6991/40483
 */

import crypto from 'crypto';

interface SmsConfig {
  accessKey: string;
  secretKey: string;
  accountId: string;
  templateId: string;
  sign: string;
}

interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// 获取配置
function getSmsConfig(): SmsConfig {
  return {
    accessKey: process.env.VOLCENGINE_ACCESS_KEY || '',
    secretKey: process.env.VOLCENGINE_SECRET_KEY || '',
    accountId: process.env.VOLCENGINE_SMS_ACCOUNT_ID || '',
    templateId: process.env.VOLCENGINE_SMS_TEMPLATE_ID || '',
    sign: process.env.VOLCENGINE_SMS_SIGN || '帮帮问法',
  };
}

// 检查是否配置了真实的短信服务
export function isSmsConfigured(): boolean {
  const config = getSmsConfig();
  return !!(config.accessKey && config.secretKey && config.accountId && config.templateId);
}

/**
 * 生成签名
 * 火山云 SMS 使用 HMAC-SHA256 签名
 */
function generateSignature(params: Record<string, string>, secretKey: string): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return crypto
    .createHmac('sha256', secretKey)
    .update(sortedParams)
    .digest('hex');
}

/**
 * 发送短信验证码
 * @param phone 手机号
 * @param code 验证码
 * @returns 发送结果
 */
export async function sendSmsCode(phone: string, code: string): Promise<SendSmsResult> {
  const config = getSmsConfig();

  // Mock 模式：未配置真实短信服务时，打印验证码到控制台
  if (!isSmsConfigured()) {
    console.log(`[SMS Mock] 发送验证码到 ${phone}: ${code}`);
    console.log(`[SMS Mock] 请在控制台查看验证码: ${code}`);
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  // 真实发送短信
  try {
    const timestamp = new Date().toISOString().replace(/\.\d{3}/, '');
    
    // 构建请求参数
    const params: Record<string, string> = {
      AccessKeyId: config.accessKey,
      AccountId: config.accountId,
      Sign: config.sign,
      TemplateId: config.templateId,
      Phone: phone,
      TemplateParam: JSON.stringify({ code }),
      Timestamp: timestamp,
      Version: '2020-01-01',
    };

    // 生成签名
    const signature = generateSignature(params, config.secretKey);
    params['Signature'] = signature;

    // 发送请求
    const response = await fetch('https://sms.volcengineapi.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });

    const data = await response.json();

    if (data.ResponseMetadata?.Error) {
      console.error('[SMS Error]', data.ResponseMetadata.Error);
      return {
        success: false,
        error: data.ResponseMetadata.Error.Message || '发送失败',
      };
    }

    return {
      success: true,
      messageId: data.Result?.MessageId,
    };
  } catch (error) {
    console.error('[SMS Exception]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '发送失败',
    };
  }
}
