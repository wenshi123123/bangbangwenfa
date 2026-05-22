/**
 * 腾讯云短信服务
 * 文档: https://cloud.tencent.com/document/product/382/43196
 */

// 使用 require 方式导入，避免 ESM 兼容问题
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tencentcloud = require('tencentcloud-sdk-nodejs');

// 导入短信模块
const SmsClient = tencentcloud.sms.v20210111.Client;

interface SmsConfig {
  secretId: string;
  secretKey: string;
  appId: string;
  signName: string;
  templateId: string;
}

interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 腾讯云短信错误码中文映射表
 * 文档: https://cloud.tencent.com/document/product/382/55995
 */
const SMS_ERROR_MESSAGES: Record<string, string> = {
  // 余额相关
  'FailedOperation.InsufficientBalanceInSmsPackage': '短信套餐余额不足，请联系客服充值',
  'FailedOperation.SmsPackageNotExist': '短信套餐包不存在，请先购买',
  
  // 手机号相关
  'FailedOperation.PhoneNumberInBlacklist': '该手机号暂时无法接收短信，请联系客服',
  'InvalidParameterValue.PhoneNumberFormatError': '手机号格式错误，请检查后重试',
  'InvalidParameterValue.NoSuchPhoneNumber': '该手机号不存在，请检查后重试',
  
  // 频率限制
  'LimitExceeded.PhoneNumberDailyLimit': '该手机号今日发送次数已达上限，请明天再试',
  'LimitExceeded.PhoneNumberOneHourLimit': '发送过于频繁，请 1 小时后再试',
  'LimitExceeded.PhoneNumberOneMinuteLimit': '发送过于频繁，请 1 分钟后再试',
  'LimitExceeded.SdkAppIdDailyLimit': '应用今日发送次数已达上限，请联系客服',
  
  // 签名相关
  'FailedOperation.SignatureIncorrect': '短信签名配置错误，请联系客服',
  'UnauthorizedOperation.SmsSignApplicant': '短信签名未通过审核，请联系客服',
  'FailedOperation.MissingSignature': '缺少短信签名，请联系客服',
  
  // 模板相关
  'FailedOperation.TemplateIncorrect': '短信模板配置错误，请联系客服',
  'FailedOperation.MissingTemplateParameter': '短信模板参数缺失，请联系客服',
  'UnsupportedOperation.ContainSensitiveWord': '短信内容包含敏感词，请修改后重试',
  
  // 其他
  'UnauthorizedOperation.RequestIpNotInWhitelist': '请求IP不在白名单中，请联系客服',
  'FailedOperation.AccountArrears': '账户欠费，请联系客服充值',
  'InternalError.UnknownError': '短信服务暂时不可用，请稍后重试',
};

/**
 * 获取友好的中文错误信息
 */
function getFriendlyErrorMessage(code: string, defaultMessage?: string): string {
  return SMS_ERROR_MESSAGES[code] || defaultMessage || '短信发送失败，请稍后重试';
}

// 获取配置
function getSmsConfig(): SmsConfig {
  return {
    secretId: process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || '',
    appId: process.env.TENCENT_SMS_APP_ID || '',
    signName: process.env.TENCENT_SMS_SIGN_NAME || '',
    templateId: process.env.TENCENT_SMS_TEMPLATE_ID || '',
  };
}

// 检查是否配置了真实的短信服务
export function isSmsConfigured(): boolean {
  const config = getSmsConfig();
  return !!(
    config.secretId &&
    config.secretKey &&
    config.appId &&
    config.signName &&
    config.templateId
  );
}

/**
 * 创建短信客户端
 */
function createClient() {
  const config = getSmsConfig();
  
  return new SmsClient({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey,
    },
    region: 'ap-guangzhou', // 短信服务区域
    profile: {
      httpProfile: {
        endpoint: 'sms.tencentcloudapi.com',
      },
    },
  });
}

/**
 * 发送短信验证码
 * @param phone 手机号（不带国际区号）
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
    const client = createClient();
    
    // 手机号需要加国际区号（中国大陆 +86）
    const phoneNumber = `+86${phone}`;
    
    const params = {
      PhoneNumberSet: [phoneNumber],
      SmsSdkAppId: config.appId,
      SignName: config.signName,
      TemplateId: config.templateId,
      TemplateParamSet: [code, '5'], // 验证码, 有效期(分钟)
    };

    const response = await client.SendSms(params);
    
    // 检查发送结果
    if (response.SendStatusSet && response.SendStatusSet.length > 0) {
      const status = response.SendStatusSet[0];
      
      if (status.Code === 'Ok') {
        return {
          success: true,
          messageId: status.SerialNo,
        };
      } else {
        console.error('[SMS Error]', status.Code, status.Message);
        // 使用友好的中文错误信息
        const friendlyMessage = getFriendlyErrorMessage(status.Code, status.Message);
        return {
          success: false,
          error: friendlyMessage,
        };
      }
    }

    return {
      success: false,
      error: '短信发送响应异常',
    };
  } catch (error: unknown) {
    console.error('[SMS Error]', error);
    
    // 解析错误信息
    let errorMessage = '短信发送失败，请稍后重试';
    if (error instanceof Error) {
      // 从错误信息中提取错误码
      const errorMatch = error.message.match(/([A-Za-z]+\.[A-Za-z]+)/);
      if (errorMatch) {
        const errorCode = errorMatch[1];
        errorMessage = getFriendlyErrorMessage(errorCode, error.message);
      } else {
        // 通用错误匹配
        if (error.message.includes('InvalidParameterValue')) {
          errorMessage = '手机号格式错误，请检查后重试';
        } else if (error.message.includes('LimitExceeded')) {
          errorMessage = '发送频率超限，请稍后再试';
        } else if (error.message.includes('InsufficientBalance')) {
          errorMessage = '短信套餐余额不足，请联系客服充值';
        }
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 发送通用短信通知
 * @param phone 手机号（不带国际区号）
 * @param templateId 短信模板ID
 * @param params 模板参数数组
 * @returns 发送结果
 */
export async function sendSmsNotification(
  phone: string, 
  templateId: string, 
  params: string[]
): Promise<SendSmsResult> {
  const config = getSmsConfig();

  // Mock 模式：未配置真实短信服务时，打印到控制台
  if (!isSmsConfigured()) {
    console.log(`[SMS Mock] 发送通知到 ${phone}, 模板: ${templateId}, 参数: ${params.join(', ')}`);
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  // 真实发送短信
  try {
    const client = createClient();
    
    // 手机号需要加国际区号（中国大陆 +86）
    const phoneNumber = `+86${phone}`;
    
    const request = {
      PhoneNumberSet: [phoneNumber],
      SmsSdkAppId: config.appId,
      SignName: config.signName,
      TemplateId: templateId,
      TemplateParamSet: params,
    };

    const response = await client.SendSms(request);
    
    // 检查发送结果
    if (response.SendStatusSet && response.SendStatusSet.length > 0) {
      const status = response.SendStatusSet[0];
      
      if (status.Code === 'Ok') {
        return {
          success: true,
          messageId: status.SerialNo,
        };
      } else {
        console.error('[SMS Notification Error]', status.Code, status.Message);
        return {
          success: false,
          error: getFriendlyErrorMessage(status.Code, status.Message),
        };
      }
    }

    return {
      success: false,
      error: '短信发送响应异常',
    };
  } catch (error: unknown) {
    console.error('[SMS Notification Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '短信发送失败',
    };
  }
}

/**
 * 发送订单通知短信
 * @param phone 手机号
 * @param orderNo 订单号
 * @param orderTitle 订单标题
 * @returns 发送结果
 */
export async function sendOrderNotificationSms(
  phone: string,
  orderNo: string,
  orderTitle: string
): Promise<SendSmsResult> {
  // 订单通知模板ID（需要单独配置）
  const orderTemplateId = process.env.TENCENT_SMS_ORDER_TEMPLATE_ID || process.env.TENCENT_SMS_TEMPLATE_ID || '';
  
  // 模板参数：订单号、订单标题
  return sendSmsNotification(phone, orderTemplateId, [orderNo, orderTitle]);
}
