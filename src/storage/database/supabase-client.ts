import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

type MockQueryResult = {
  data: any;
  error: null;
  count?: number;
};

type MockFilter = {
  type: 'eq' | 'gte' | 'gt' | 'lte' | 'lt' | 'in' | 'or' | 'neq' | 'contains' | 'ilike' | 'filter';
  column?: string;
  value?: any;
};

const mockTableStore = new Map<string, any[]>();
const mockTableSequences = new Map<string, number>();

function getMockTableRows(table: string): any[] {
  if (!mockTableStore.has(table)) {
    mockTableStore.set(table, []);
  }
  return mockTableStore.get(table)!;
}

function nextMockId(table: string): number {
  const current = mockTableSequences.get(table) || 1;
  mockTableSequences.set(table, current + 1);
  return current;
}

export function hasSupabaseConfig(): boolean {
  loadEnv();
  return !!(process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !!(process.env.COZE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function createMockQueryBuilder(table: string, defaultData: any = null) {
  const resolved: MockQueryResult = { data: defaultData, error: null, count: 0 };
  const state: {
    filters: MockFilter[];
    pendingInsert: any[] | null;
    selectedColumns: string | null;
    limitCount: number | null;
  } = {
    filters: [],
    pendingInsert: null,
    selectedColumns: null,
    limitCount: null,
  };

  const normalize = (value: any) => {
    if (value === null || value === undefined) return value;
    return String(value);
  };

  const matchesFilters = (row: any) => {
    return state.filters.every((filter) => {
      if (!filter.column) return true;
      const rowValue = row?.[filter.column];
      const expectedValue = filter.value;

      switch (filter.type) {
        case 'eq':
          return normalize(rowValue) === normalize(expectedValue);
        case 'gte':
          return normalize(rowValue) >= normalize(expectedValue);
        case 'gt':
          return normalize(rowValue) > normalize(expectedValue);
        case 'lte':
          return normalize(rowValue) <= normalize(expectedValue);
        case 'lt':
          return normalize(rowValue) < normalize(expectedValue);
        case 'neq':
          return normalize(rowValue) !== normalize(expectedValue);
        default:
          return true;
      }
    });
  };

  const projectColumns = (row: any) => {
    if (!row || !state.selectedColumns || state.selectedColumns === '*') return row;
    const columns = state.selectedColumns.split(',').map((item) => item.trim()).filter(Boolean);
    const projected: Record<string, any> = {};
    for (const column of columns) {
      projected[column] = row[column];
    }
    return projected;
  };

  const applyLimit = (rows: any[]) => {
    if (state.limitCount === null) return rows;
    return rows.slice(0, state.limitCount);
  };

  const builder: any = {
    select(columns = '*') {
      state.selectedColumns = columns;
      return builder;
    },
    eq(column: string, value: any) {
      state.filters.push({ type: 'eq', column, value });
      return builder;
    },
    in(column: string, value: any) {
      state.filters.push({ type: 'in', column, value });
      return builder;
    },
    filter(column: string, _operator: any, value: any) {
      state.filters.push({ type: 'filter', column, value });
      return builder;
    },
    order() { return builder; },
    limit(count: number) {
      state.limitCount = count;
      return builder;
    },
    range() { return builder; },
    gte(column: string, value: any) {
      state.filters.push({ type: 'gte', column, value });
      return builder;
    },
    gt(column: string, value: any) {
      state.filters.push({ type: 'gt', column, value });
      return builder;
    },
    lte(column: string, value: any) {
      state.filters.push({ type: 'lte', column, value });
      return builder;
    },
    lt(column: string, value: any) {
      state.filters.push({ type: 'lt', column, value });
      return builder;
    },
    ilike(column: string, value: any) {
      state.filters.push({ type: 'ilike', column, value });
      return builder;
    },
    or() { return builder; },
    neq(column: string, value: any) {
      state.filters.push({ type: 'neq', column, value });
      return builder;
    },
    contains() { return builder; },
    insert(rows: any) {
      state.pendingInsert = Array.isArray(rows) ? rows : [rows];
      return builder;
    },
    update() { return builder; },
    upsert() { return builder; },
    delete() { return builder; },
    single: async () => {
      if (state.pendingInsert) {
        const inserted = state.pendingInsert.map((row) => {
          const nextRow = { ...row };
          if (nextRow.id === undefined || nextRow.id === null) {
            nextRow.id = nextMockId(table);
          }
          getMockTableRows(table).push(nextRow);
          return nextRow;
        });
        const row = inserted[0] ? projectColumns(inserted[0]) : null;
        return { data: row, error: null, count: row ? 1 : 0 };
      }

      const rows = applyLimit(getMockTableRows(table).filter(matchesFilters));
      const row = rows[0] ? projectColumns(rows[0]) : null;
      return { data: row, error: null, count: row ? 1 : 0 };
    },
    maybeSingle: async () => {
      const result = await builder.single();
      return result;
    },
    then: (onFulfilled: any, onRejected: any) => Promise.resolve(resolved).then(onFulfilled, onRejected),
    catch: (onRejected: any) => Promise.resolve(resolved).catch(onRejected),
    finally: (onFinally: any) => Promise.resolve(resolved).finally(onFinally),
  };

  return builder;
}

function createMockSupabaseClient(): SupabaseClient {
  const mockClient: any = {
    from(table: string) {
      return createMockQueryBuilder(table);
    },
    rpc() {
      return Promise.resolve({ data: null, error: null });
    },
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    storage: {
      from() {
        return {
          upload: async () => ({ data: null, error: null }),
          download: async () => ({ data: null, error: null }),
          remove: async () => ({ data: null, error: null }),
          list: async () => ({ data: [], error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        };
      },
    },
  };

  return mockClient as SupabaseClient;
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
  if (!hasSupabaseConfig()) {
    return createMockSupabaseClient();
  }

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

  if (!hasSupabaseConfig()) {
    return createMockSupabaseClient();
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
