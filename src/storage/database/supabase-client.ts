import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

/**
 * 加载环境变量
 * 优先使用进程环境变量，然后尝试 dotenv 加载 .env 文件
 */
function loadEnv(): void {
  if (envLoaded) {
    return;
  }

  // 检查是否已有必要的环境变量（COZE_ 或 NEXT_PUBLIC_ 前缀）
  const hasUrl = !!(process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = !!(process.env.COZE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasUrl && hasAnonKey) {
    envLoaded = true;
    return;
  }

  // 关键变量缺失，尝试通过 dotenv 加载 .env 文件
  try {
    dotenv.config();
  } catch {
    // dotenv 不可用，静默处理
  }
  envLoaded = true;
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  // 支持 COZE_ 前缀和 NEXT_PUBLIC_ 前缀两种命名
  const url = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL is not set. Please configure NEXT_PUBLIC_SUPABASE_URL or COZE_SUPABASE_URL environment variable.');
  }
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is not set. Please configure NEXT_PUBLIC_SUPABASE_ANON_KEY or COZE_SUPABASE_ANON_KEY environment variable.');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  // 支持 COZE_ 前缀和 SUPABASE_ 前缀两种命名
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  if (token) {
    // 带用户Token的客户端需要每次创建（Token不同）
    return createClient(url, key, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      db: {
        timeout: 60000,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // 无Token时复用单例（服务端默认客户端）
  if (!cachedDefaultClient) {
    cachedDefaultClient = createClient(url, key, {
      db: {
        timeout: 60000,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return cachedDefaultClient;
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };

// ============================================
// 懒加载 Supabase 客户端（用于 API 路由）
// 避免在构建时因环境变量未设置而失败
// ============================================
let cachedSupabase: SupabaseClient | null = null;
let cachedDefaultClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  const url = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  // 如果没有环境变量，抛出明确错误而非创建假客户端
  if (!url || !key) {
    throw new Error(
      'Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) environment variables.'
    );
  }

  cachedSupabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { timeout: 60000 }
  });
  return cachedSupabase;
}
