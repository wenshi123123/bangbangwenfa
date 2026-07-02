/**
 * 验证码管理工具
 * 
 * 功能：
 * 1. 生成 6 位数字验证码
 * 2. 存储验证码（使用 Supabase 数据库）
 * 3. 验证验证码
 * 4. 限制发送频率
 */

import { getSupabaseAdmin } from '../../storage/database/supabase-client';
import { checkRateLimit } from '@/lib/rate-limit';

// 配置
const CONFIG = {
  CODE_LENGTH: 6,                    // 验证码长度
  CODE_EXPIRE_TIME: 5 * 60 * 1000,   // 验证码有效期 5 分钟
  MAX_ATTEMPTS: 5,                    // 最大验证尝试次数
  PHONE_INTERVAL: 60 * 1000,          // 同一手机号发送间隔 60 秒
  PHONE_DAILY_LIMIT: 50,              // 同一手机号每日最多发送 50 条
  IP_HOURLY_LIMIT: 20,                // 同一 IP 每小时最多发送 20 条
};

/**
 * 生成随机验证码
 */
export function generateCode(): string {
  let code = '';
  for (let i = 0; i < CONFIG.CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

/**
 * 检查手机号发送频率限制
 * @returns { allowed: boolean, waitTime?: number, reason?: string }
 */
export async function checkPhoneRateLimit(phone: string): Promise<{ allowed: boolean; waitTime?: number; reason?: string }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    // 查询今日发送次数
    const { count, error } = await getSupabaseAdmin()
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('created_at', today.toISOString());

    if (error) {
      console.error('查询发送次数失败:', error);
      // 表不存在时允许发送
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return { allowed: true };
      }
      return { allowed: true }; // 查询失败时允许发送
    }

  // 检查每日限制
  if (count && count >= CONFIG.PHONE_DAILY_LIMIT) {
    return { 
      allowed: false, 
      reason: '今日发送次数已达上限，请明天再试' 
    };
  }

  // 检查发送间隔（最近一次验证码）
  const { data: lastCode } = await getSupabaseAdmin()
    .from('sms_verification_codes')
    .select('created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastCode) {
    const lastTime = new Date(lastCode.created_at).getTime();
    const elapsed = now.getTime() - lastTime;
    if (elapsed < CONFIG.PHONE_INTERVAL) {
      const waitTime = Math.ceil((CONFIG.PHONE_INTERVAL - elapsed) / 1000);
      return { 
        allowed: false, 
        waitTime,
        reason: `请等待 ${waitTime} 秒后再试` 
      };
    }
  }

  return { allowed: true };
  } catch (err) {
    if (err instanceof Error && (err.message.includes('does not exist') || err.message.includes('42P01'))) {
      return { allowed: true };
    }
    console.error('检查手机号频率限制失败:', err);
    return { allowed: true };
  }
}

/**
 * 检查 IP 发送频率限制
 */
export async function checkIpRateLimit(ip: string): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fallback = checkRateLimit(`sms-ip:${ip}`, CONFIG.IP_HOURLY_LIMIT, 60 * 60 * 1000);

  if (!fallback.allowed) {
    return { allowed: false, reason: '请求过于频繁，请稍后再试' };
  }

  try {
    // 查询 IP 最近一小时的发送次数
    const { count, error } = await getSupabaseAdmin()
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', oneHourAgo.toISOString());

    if (error) {
      console.error('查询IP发送次数失败:', error);
      // 表不存在时允许发送
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return { allowed: true };
      }
      return { allowed: true };
    }

  if (count && count >= CONFIG.IP_HOURLY_LIMIT) {
    return { 
      allowed: false, 
      reason: '请求过于频繁，请稍后再试' 
    };
  }

  return { allowed: true };
  } catch (err) {
    if (err instanceof Error && (err.message.includes('does not exist') || err.message.includes('42P01'))) {
      return { allowed: true };
    }
    console.error('检查IP频率限制失败:', err);
    return { allowed: true };
  }
}

/**
 * 存储验证码到数据库
 */
export async function storeCode(phone: string, code: string, ip: string, type: string = 'login'): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CONFIG.CODE_EXPIRE_TIME);

  try {
    const { error } = await getSupabaseAdmin()
      .from('sms_verification_codes')
      .insert({
        phone,
        code,
        ip,
        type,
        attempts: 0,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      // 表不存在时记录日志但不阻止流程
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('警告: sms_verification_codes 表不存在，验证码将仅打印到控制台');
        console.log(`[SMS] 验证码: ${code} (仅开发模式)`);
        return;
      }
      console.error('存储验证码失败:', error);
      throw new Error('存储验证码失败');
    }

    // 异步清理过期数据
    cleanupExpiredCodes();
  } catch (err) {
    // 表不存在时允许通过（开发模式）
    if (err instanceof Error && (err.message.includes('does not exist') || err.message.includes('42P01'))) {
      console.warn('警告: sms_verification_codes 表不存在');
      console.log(`[SMS] 验证码: ${code} (仅开发模式)`);
      return;
    }
    throw err;
  }
}

/**
 * 验证验证码
 * @returns { valid: boolean, reason?: string }
 */
export async function verifyCode(phone: string, inputCode: string, type: string = 'login'): Promise<{ valid: boolean; reason?: string }> {
  const now = new Date();

  try {
    // 查询有效的验证码
    const { data: storedData, error } = await getSupabaseAdmin()
      .from('sms_verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('type', type)
      .eq('used', false)
      .gt('expires_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 表不存在时进入开发模式验证（仅当环境变量 ENABLE_DEV_SMS_FALLBACK=true 时启用）
    if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
      console.warn('警告: sms_verification_codes 表不存在');
      if (process.env.ENABLE_DEV_SMS_FALLBACK === 'true') {
        console.warn('开发模式回退已启用，验证码 123456 可通过验证');
        if (inputCode === '123456') {
          return { valid: true };
        }
      }
      return { valid: false, reason: '短信服务暂不可用，请稍后重试' };
    }

    if (error || !storedData) {
      return { valid: false, reason: '验证码已过期，请重新获取' };
    }

    // 检查尝试次数
    if (storedData.attempts && storedData.attempts >= CONFIG.MAX_ATTEMPTS) {
      await getSupabaseAdmin()
        .from('sms_verification_codes')
        .update({ used: true, used_at: now.toISOString() })
        .eq('id', storedData.id);
      return { valid: false, reason: '验证次数过多，请重新获取验证码' };
    }

    // 验证码正确
    if (storedData.code === inputCode) {
      await getSupabaseAdmin()
        .from('sms_verification_codes')
        .update({ used: true, used_at: now.toISOString() })
        .eq('id', storedData.id);
      return { valid: true };
    }

    // 验证码错误，增加尝试次数
    const newAttempts = (storedData.attempts || 0) + 1;
    await getSupabaseAdmin()
      .from('sms_verification_codes')
      .update({ attempts: newAttempts })
      .eq('id', storedData.id);

    const remainingAttempts = CONFIG.MAX_ATTEMPTS - newAttempts;

    return {
      valid: false,
      reason: `验证码错误，还剩 ${remainingAttempts} 次机会`
    };
  } catch (err) {
    // 表不存在时进入开发模式验证（仅当环境变量 ENABLE_DEV_SMS_FALLBACK=true 时启用）
    if (err instanceof Error && (err.message.includes('does not exist') || err.message.includes('42P01'))) {
      console.warn('警告: sms_verification_codes 表不存在');
      if (process.env.ENABLE_DEV_SMS_FALLBACK === 'true') {
        console.warn('开发模式回退已启用，验证码 123456 可通过验证');
        if (inputCode === '123456') {
          return { valid: true };
        }
      }
      return { valid: false, reason: '短信服务暂不可用，请稍后重试' };
    }
    throw err;
  }
}

/**
 * 删除验证码（验证成功后调用）
 */
export async function deleteCode(phone: string, type: string = 'login'): Promise<void> {
  const now = new Date();
  await getSupabaseAdmin()
    .from('sms_verification_codes')
    .update({ used: true, used_at: now.toISOString() })
    .eq('phone', phone)
    .eq('type', type)
    .eq('used', false);
}

/**
 * 清除验证码（别名）
 */
export const clearCode = deleteCode;

/**
 * 验证码管理器类（面向对象方式）
 */
export const VerifyCodeManager = {
  generateCode,
  storeCode,
  verifyCode,
  deleteCode,
  clearCode,
  checkPhoneRateLimit,
  checkIpRateLimit,
};

/**
 * 清理过期的验证码
 */
async function cleanupExpiredCodes(): Promise<void> {
  const now = new Date();
  
  try {
    await getSupabaseAdmin()
      .from('sms_verification_codes')
      .delete()
      .lt('expires_at', now.toISOString());
  } catch (error) {
    console.error('清理过期验证码失败:', error);
  }
}

/**
 * 获取验证码剩余有效时间（秒）
 */
export async function getCodeRemainingTime(phone: string, type: string = 'login'): Promise<number> {
  const now = new Date();
  
  const { data } = await getSupabaseAdmin()
    .from('sms_verification_codes')
    .select('expires_at')
    .eq('phone', phone)
    .eq('type', type)
    .eq('used', false)
    .gt('expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return 0;
  
  const remaining = new Date(data.expires_at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * 获取发送间隔剩余时间（秒）
 */
export async function getSendIntervalRemaining(phone: string): Promise<number> {
  const now = new Date();
  
  const { data } = await getSupabaseAdmin()
    .from('sms_verification_codes')
    .select('created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return 0;
  
  const elapsed = now.getTime() - new Date(data.created_at).getTime();
  const remaining = Math.max(0, CONFIG.PHONE_INTERVAL - elapsed);
  return Math.ceil(remaining / 1000);
}

/**
 * 清理指定手机号的频率限制数据
 * @param phone 手机号，不传则清理所有
 */
export async function clearRateLimit(phone?: string): Promise<{ success: boolean; message: string }> {
  const now = new Date();
  
  try {
    if (phone) {
      // 删除该手机号的所有验证码记录
      await getSupabaseAdmin()
        .from('sms_verification_codes')
        .delete()
        .eq('phone', phone);
      return { success: true, message: `已清理手机号 ${phone} 的频率限制` };
    } else {
      // 删除所有验证码记录
      const { count } = await getSupabaseAdmin()
        .from('sms_verification_codes')
        .delete()
        .neq('id', 0);
      return { success: true, message: `已清理所有手机号的频率限制` };
    }
  } catch (error) {
    console.error('清理频率限制失败:', error);
    return { success: false, message: '清理频率限制失败' };
  }
}

/**
 * 获取当前频率限制状态
 */
export async function getRateLimitStatus(phone: string): Promise<{ 
  dailyCount: number; 
  dailyLimit: number;
  canSend: boolean;
  remainingSeconds: number;
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 查询今日发送次数
  const { count } = await getSupabaseAdmin()
    .from('sms_verification_codes')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', today.toISOString());

  const dailyCount = count || 0;

  // 查询最近一次验证码
  const { data: lastCode } = await getSupabaseAdmin()
    .from('sms_verification_codes')
    .select('created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let intervalRemaining = 0;
  if (lastCode) {
    const elapsed = now.getTime() - new Date(lastCode.created_at).getTime();
    intervalRemaining = Math.max(0, CONFIG.PHONE_INTERVAL - elapsed);
  }
  
  return {
    dailyCount,
    dailyLimit: CONFIG.PHONE_DAILY_LIMIT,
    canSend: dailyCount < CONFIG.PHONE_DAILY_LIMIT && intervalRemaining === 0,
    remainingSeconds: Math.ceil(intervalRemaining / 1000)
  };
}
