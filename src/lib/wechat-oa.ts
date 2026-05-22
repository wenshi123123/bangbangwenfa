/**
 * 微信公众平台通知工具库
 * 包含模板消息发送、AccessToken 获取等功能
 */

interface WechatTemplateData {
  first?: { value: string; color?: string };
  keyword1?: { value: string; color?: string };
  keyword2?: { value: string; color?: string };
  keyword3?: { value: string; color?: string };
  keyword4?: { value: string; color?: string };
  keyword5?: { value: string; color?: string };
  remark?: { value: string; color?: string };
}

interface SendNotificationParams {
  openid: string;
  template_id: string;
  data: WechatTemplateData;
  url?: string;
  miniprogram?: {
    appid: string;
    pagepath: string;
  };
}

// 缓存 access_token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * 获取微信 AccessToken
 * @returns access_token 和过期时间
 */
async function getAccessToken(): Promise<{ token: string; expiresAt: number }> {
  // 检查缓存是否有效（提前5分钟过期）
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 5 * 60 * 1000) {
    return cachedAccessToken;
  }

  const appId = process.env.WEIXIN_OA_APPID;
  const appSecret = process.env.WEIXIN_OA_APPSECRET;

  if (!appId || !appSecret) {
    throw new Error('未配置微信公众号参数');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode) {
      throw new Error(`获取access_token失败: ${data.errmsg}`);
    }

    // access_token 有效期为2小时，提前缓存
    cachedAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000
    };

    return cachedAccessToken;
  } catch (err) {
    console.error('获取微信access_token失败:', err);
    throw err;
  }
}

/**
 * 发送微信模板消息
 * @param params 发送参数
 * @returns 发送结果
 */
export async function sendWechatNotification(params: SendNotificationParams): Promise<{ success: boolean; message?: string; error?: string }> {
  const { openid, template_id, data, url, miniprogram } = params;

  // 检查参数
  if (!openid || !template_id) {
    return { success: false, error: '缺少必要参数' };
  }

  // 检查环境变量
  if (!process.env.WEIXIN_OA_APPID || !process.env.WEIXIN_OA_APPSECRET) {
    console.warn('未配置微信公众号参数，模拟发送通知');
    console.log('=== 模拟微信模板消息 ===');
    console.log('OpenID:', openid ? `${openid.slice(0, 6)}***` : 'null');
    console.log('模板ID:', template_id);
    console.log('消息内容:', JSON.stringify(data, null, 2));
    console.log('============================');
    return { success: true, message: '模拟发送成功' };
  }

  try {
    // 获取 access_token
    const { token } = await getAccessToken();

    // 构建发送请求
    const sendData: any = {
      touser: openid,
      template_id: template_id,
      data: data
    };

    if (url) {
      sendData.url = url;
    }

    if (miniprogram) {
      sendData.miniprogram = miniprogram;
    }

    // 发送模板消息
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendData)
      }
    );

    const result = await response.json();

    if (result.errcode && result.errcode !== 0) {
      console.error('微信模板消息发送失败:', result);
      
      // 如果是token过期，清除缓存重试
      if (result.errcode === 40001) {
        cachedAccessToken = null;
        return sendWechatNotification(params); // 递归重试
      }
      
      return { success: false, error: result.errmsg || '发送失败' };
    }

    console.log('微信模板消息发送成功:', result);
    return { success: true, message: '发送成功', error: undefined };

  } catch (err: any) {
    console.error('发送微信通知异常:', err);
    return { success: false, error: err.message || '发送异常' };
  }
}

/**
 * 发送支付成功通知
 * @param openid 用户微信openid
 * @param orderNo 订单号
 * @param orderTitle 订单标题
 * @returns 发送结果
 */
export async function sendPaymentSuccessNotification(
  openid: string,
  orderNo: string,
  orderTitle: string = '法律咨询订单'
): Promise<{ success: boolean; error?: string }> {
  const templateId = process.env.WEIXIN_OA_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';

  const result = await sendWechatNotification({
    openid,
    template_id: templateId,
    data: {
      first: {
        value: '您的法律咨询订单已支付成功！',
        color: '#173177'
      },
      keyword1: {
        value: orderNo,
        color: '#173177'
      },
      keyword2: {
        value: '已支付',
        color: '#07c160'
      },
      keyword3: {
        value: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        color: '#173177'
      },
      remark: {
        value: '请立即添加客服微信，我们将尽快为您匹配专业律师。如有问题可随时联系客服。',
        color: '#ed4012'
      }
    }
  });

  return { success: result.success, error: result.error };
}

/**
 * 发送派单成功通知
 * @param openid 用户微信openid
 * @param orderNo 订单号
 * @param lawyerName 律师姓名
 * @returns 发送结果
 */
export async function sendDispatchNotification(
  openid: string,
  orderNo: string,
  lawyerName: string
): Promise<{ success: boolean; error?: string }> {
  const templateId = process.env.WEIXIN_OA_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';

  const result = await sendWechatNotification({
    openid,
    template_id: templateId,
    data: {
      first: {
        value: '您的法律咨询已成功匹配律师！',
        color: '#173177'
      },
      keyword1: {
        value: orderNo,
        color: '#173177'
      },
      keyword2: {
        value: lawyerName,
        color: '#07c160'
      },
      keyword3: {
        value: '已匹配',
        color: '#173177'
      },
      remark: {
        value: '律师将在24小时内与您联系，请保持手机畅通。如需紧急咨询，请直接拨打客服电话。',
        color: '#ed4012'
      }
    }
  });

  return { success: result.success, error: result.error };
}

// 清除缓存的access_token（用于测试或强制刷新）
export function clearAccessTokenCache(): void {
  cachedAccessToken = null;
}
