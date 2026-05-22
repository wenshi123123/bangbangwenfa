import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES GCM 推荐 12 字节，这里使用 16 字节增加安全边际
const AUTH_TAG_LENGTH = 16; // 128 位认证标签
const KEY_LENGTH = 32; // 256 位密钥

/**
 * 从 JWT_SECRET 派生出加密密钥
 * 使用 PBKDF2 (100,000 迭代) 确保即使原始密钥泄露，加密密钥也不同
 */
function deriveEncryptionKey(): Buffer {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('缺少 JWT_SECRET 环境变量，无法初始化加密模块');
  }
  return crypto.pbkdf2Sync(jwtSecret, 'bangbangwenfa-encryption-salt', 100000, KEY_LENGTH, 'sha512');
}

/**
 * 加密敏感数据
 * @param plaintext 明文
 * @returns 格式: iv:authTag:ciphertext (全部 hex 编码)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // 格式: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密敏感数据
 * @param encryptedData 格式: iv:authTag:ciphertext (全部 hex 编码)
 * @returns 明文，如果输入不包含冒号分隔符则原样返回（兼容旧数据）
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // 不是加密格式，原样返回（兼容历史明文数据）
    return encryptedData;
  }

  try {
    const key = deriveEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // 解密失败，可能为旧数据或损坏数据，原样返回
    console.warn('解密敏感字段失败，返回原始值');
    return encryptedData;
  }
}

/**
 * 批量加密对象中的指定字段
 * @param obj 原始对象
 * @param fields 要加密的字段名数组
 * @returns 加密后的新对象
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly string[]
): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const field of fields) {
    if (typeof result[field] === 'string' && result[field]) {
      result[field] = encrypt(result[field] as string);
    }
  }
  return result as T;
}

/**
 * 批量解密对象中的指定字段
 * @param obj 加密后的对象
 * @param fields 要解密的字段名数组
 * @returns 解密后的新对象
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly string[]
): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const field of fields) {
    if (typeof result[field] === 'string' && result[field]) {
      result[field] = decrypt(result[field] as string);
    }
  }
  return result as T;
}

/**
 * 律师敏感字段列表
 */
export const LAWYER_SENSITIVE_FIELDS = [
  'id_card',         // 身份证号码
  'license_no',      // 执业证号
  'real_name',       // 真实姓名（可选加密）
] as const;

/**
 * 律师申请表敏感字段列表
 */
export const LAWYER_APPLICATION_SENSITIVE_FIELDS = [
  'license_number',  // 执业证号
  'name',            // 真实姓名
] as const;
