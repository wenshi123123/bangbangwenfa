/**
 * 微信支付平台证书管理
 * 自动获取、缓存和更新微信支付平台证书
 */

import crypto from 'crypto';
import { normalizePem, getEnvValue } from './wechat-pay';

// 证书缓存
let cachedCertificates: Map<string, { cert: string; expireTime: number }> = new Map();
let lastFetchTime: number = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12小时缓存

/**
 * 生成请求签名
 */
function generateSignature(
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
 * 生成授权头
 */
function generateAuthorization(
  mchid: string,
  serialNo: string,
  nonce: string,
  timestamp: string,
  signature: string
): string {
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",signature="${signature}",serial_no="${serialNo}",timestamp="${timestamp}"`;
}

/**
 * 解密平台证书
 */
function decryptCertificate(
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
 * 从微信支付API获取平台证书
 */
async function fetchCertificatesFromWechat(): Promise<Map<string, string>> {
  const mchid = process.env.WEIXIN_MCHID || '';
  const serialNo = process.env.WEIXIN_SERIAL_NO || '';
  const apiV3Key = process.env.WEIXIN_APIV3_KEY || '';
  const privateKey = process.env.WEIXIN_PRIVATE_KEY || '';
  
  if (!mchid || !serialNo || !apiV3Key || !privateKey) {
    console.warn('微信支付配置不完整，无法获取平台证书');
    return new Map();
  }
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(32).toString('hex');
    const url = '/v3/certificates';
    
    const signature = generateSignature('GET', url, timestamp, nonce, '', privateKey);
    const authorization = generateAuthorization(mchid, serialNo, nonce, timestamp, signature);
    
    const response = await fetch('https://api.mch.weixin.qq.com/v3/certificates', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authorization,
        'User-Agent': 'BBWF/1.0',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('获取平台证书失败:', response.status, errorText);
      return new Map();
    }
    
    const data = await response.json();
    const certificates = new Map<string, string>();
    
    if (data.data && Array.isArray(data.data)) {
      for (const cert of data.data) {
        const { serial_no, effective_time, expire_time, encrypt_certificate } = cert;
        
        // 解密证书
        const decryptedCert = decryptCertificate(
          encrypt_certificate.ciphertext,
          encrypt_certificate.associated_data,
          encrypt_certificate.nonce,
          apiV3Key
        );
        
        // 缓存证书
        certificates.set(serial_no, decryptedCert);
        
        // 更新全局缓存
        cachedCertificates.set(serial_no, {
          cert: decryptedCert,
          expireTime: new Date(expire_time).getTime(),
        });
      }
    }
    
    lastFetchTime = Date.now();
    console.log('成功获取微信平台证书，数量:', certificates.size);
    
    return certificates;
  } catch (error) {
    console.error('获取平台证书异常:', error);
    return new Map();
  }
}

/**
 * 获取平台证书（自动获取或使用缓存）
 * @param serialNo 证书序列号（可选，不传则返回最新的证书）
 */
export async function getPlatformCertificate(serialNo?: string): Promise<string | null> {
  // 检查缓存是否过期
  const now = Date.now();
  if (now - lastFetchTime > CACHE_DURATION || cachedCertificates.size === 0) {
    await fetchCertificatesFromWechat();
  }
  
  // 如果指定了序列号，返回对应证书
  if (serialNo) {
    const cached = cachedCertificates.get(serialNo);
    if (cached && cached.expireTime > now) {
      return cached.cert;
    }
  }
  
  // 返回最新的有效证书
  for (const [sn, cached] of cachedCertificates) {
    if (cached.expireTime > now) {
      return cached.cert;
    }
  }
  
  // 尝试从环境变量获取（手动配置的证书，支持分段）
  const envCert = getEnvValue('WEIXIN_PLATFORM_CERT');
  if (envCert) {
    return normalizePem(envCert, 'CERTIFICATE');
  }
  
  return null;
}

/**
 * 验证微信支付签名
 * @param signature 签名
 * @param timestamp 时间戳
 * @param nonce 随机数
 * @param body 请求体
 * @param serialNo 证书序列号
 */
export async function verifyWechatPaySignature(
  signature: string,
  timestamp: string,
  nonce: string,
  body: string,
  serialNo: string
): Promise<{ valid: boolean; reason?: string }> {
  const signStr = `${timestamp}\n${nonce}\n${body}\n`;
  
  try {
    // 获取平台证书
    const cert = await getPlatformCertificate(serialNo);
    
    if (!cert) {
      // 无论生产还是开发环境，没有证书都必须拒绝
      console.error('未获取到微信平台证书，签名验证失败');
      return { valid: false, reason: '未获取到平台证书，无法验证签名' };
    }
    
    // 验证签名
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signStr);
    
    const isValid = verifier.verify(cert, signature, 'base64');
    
    if (!isValid) {
      console.error('签名验证失败');
      return { valid: false, reason: '签名不匹配' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('签名验证异常:', error);
    return { valid: false, reason: '验证异常' };
  }
}

/**
 * 初始化平台证书（启动时调用）
 */
export async function initPlatformCertificates(): Promise<boolean> {
  // 如果已配置手动证书，跳过自动获取
  if (process.env.WEIXIN_PLATFORM_CERT) {
    console.log('使用手动配置的平台证书');
    return true;
  }
  
  // 如果没有配置商户私钥，跳过自动获取
  if (!process.env.WEIXIN_PRIVATE_KEY) {
    console.warn('未配置商户私钥(WEIXIN_PRIVATE_KEY)，无法自动获取平台证书');
    console.warn('请配置 WEIXIN_PRIVATE_KEY 或 WEIXIN_PLATFORM_CERT');
    return false;
  }
  
  const certs = await fetchCertificatesFromWechat();
  return certs.size > 0;
}
