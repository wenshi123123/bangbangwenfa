/**
 * 安全日志工具
 * 
 * 生产环境只输出 warn 和 error，
 * 开发环境输出所有级别。
 * 自动脱敏敏感字段。
 */

const isProd = process.env.NODE_ENV === 'production' || process.env.DEPLOY_ENV === 'PROD';

// 需要脱敏的键名模式
const SENSITIVE_KEYS = [
  'password', 'passwd', 'token', 'secret', 'apikey', 'api_key',
  'authorization', 'cookie', 'openid', 'phone', 'mobile',
  'id_card', 'idcard', 'credit_card',
];

function maskValue(key: string, value: any): any {
  if (value === null || value === undefined) return value;

  const lowerKey = key.toLowerCase();
  const isSensitive = SENSITIVE_KEYS.some(sk => lowerKey.includes(sk));

  if (isSensitive && typeof value === 'string' && value.length > 4) {
    return `${value.slice(0, 4)}***`;
  }
  return value;
}

function maskObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item, i) => maskValue(`_${i}`, item));

  const masked: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      masked[key] = maskObject(value);
    } else {
      masked[key] = maskValue(key, value);
    }
  }
  return masked;
}

/**
 * 调试日志 — 仅开发环境输出
 */
export function debugLog(...args: any[]) {
  if (!isProd) {
    console.log('[DEBUG]', ...args.map(a => (typeof a === 'object' ? maskObject(a) : a)));
  }
}

/**
 * 信息日志 — 仅开发环境输出
 */
export function infoLog(...args: any[]) {
  if (!isProd) {
    console.log('[INFO]', ...args.map(a => (typeof a === 'object' ? maskObject(a) : a)));
  }
}

/**
 * 警告日志 — 所有环境输出
 */
export function warnLog(...args: any[]) {
  console.warn('[WARN]', ...args.map(a => (typeof a === 'object' ? maskObject(a) : a)));
}

/**
 * 错误日志 — 所有环境输出
 */
export function errorLog(...args: any[]) {
  console.error('[ERROR]', ...args.map(a => (typeof a === 'object' ? maskObject(a) : a)));
}
