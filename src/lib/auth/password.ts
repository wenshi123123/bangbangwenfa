import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 验证密码强度
 * 至少6位，包含字母和数字
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: '密码至少需要6位字符' };
  }
  if (password.length > 20) {
    return { valid: false, message: '密码不能超过20位字符' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个数字' };
  }
  return { valid: true };
}

/**
 * 验证用户名格式
 * 2-20字符，支持中文、字母、数字、下划线
 */
export function validateUsername(username: string): { valid: boolean; message?: string } {
  if (username.length < 2) {
    return { valid: false, message: '用户名至少需要2个字符' };
  }
  if (username.length > 20) {
    return { valid: false, message: '用户名不能超过20个字符' };
  }
  // 支持中文、字母、数字、下划线
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: '用户名只能包含中文、字母、数字和下划线' };
  }
  // 检查保留词（英文）
  const reservedWords = ['admin', 'administrator', 'system', 'root', 'test', 'user', 'api', 'null', 'undefined', '管理员', '系统', '官方'];
  if (reservedWords.includes(username.toLowerCase())) {
    return { valid: false, message: '该用户名不可用' };
  }
  return { valid: true };
}
