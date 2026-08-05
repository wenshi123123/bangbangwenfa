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

export function resetMockDatabase(tables: Record<string, any[]> = {}): void {
  mockTableStore.clear();
  mockTableSequences.clear();
  for (const [table, rows] of Object.entries(tables)) {
    mockTableStore.set(table, rows.map((row) => ({ ...row })));
  }
}

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
    pendingUpdate: Record<string, unknown> | null;
    pendingDelete: boolean;
    selectedColumns: string | null;
    limitCount: number | null;
    rangeStart: number | null;
    rangeEnd: number | null;
    orderColumn: string | null;
    orderAscending: boolean;
  } = {
    filters: [],
    pendingInsert: null,
    pendingUpdate: null,
    pendingDelete: false,
    selectedColumns: null,
    limitCount: null,
    rangeStart: null,
    rangeEnd: null,
    orderColumn: null,
    orderAscending: true,
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
    order(column: string, options?: { ascending?: boolean }) { state.orderColumn = column; state.orderAscending = options?.ascending !== false; return builder; },
    limit(count: number) {
      state.limitCount = count;
      return builder;
    },
    range(start: number, end: number) { state.rangeStart = start; state.rangeEnd = end; return builder; },
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
    update(values: Record<string, unknown>) { state.pendingUpdate = values; return builder; },
    upsert() { return builder; },
    delete() { state.pendingDelete = true; return builder; },
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

      const source = getMockTableRows(table);
      const matches = source.filter(matchesFilters);
      if (state.pendingUpdate) Object.assign(matches[0] || {}, state.pendingUpdate);
      if (state.pendingDelete) {
        for (const row of matches) source.splice(source.indexOf(row), 1);
      }
      let rows = matches;
      if (state.orderColumn) rows = [...rows].sort((a, b) => (a[state.orderColumn!] > b[state.orderColumn!] ? 1 : -1) * (state.orderAscending ? 1 : -1));
      if (state.rangeStart !== null && state.rangeEnd !== null) rows = rows.slice(state.rangeStart, state.rangeEnd + 1);
      rows = applyLimit(rows);
      const row = rows[0] ? projectColumns(rows[0]) : null;
      return { data: row, error: null, count: row ? 1 : 0 };
    },
    maybeSingle: async () => {
      const result = await builder.single();
      return result;
    },
    then: (onFulfilled: any, onRejected: any) => {
      const rows = getMockTableRows(table).filter(matchesFilters);
      const data = applyLimit(rows).map(projectColumns);
      return Promise.resolve({ data, error: null, count: data.length }).then(onFulfilled, onRejected);
    },
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
    rpc(name: string, args: Record<string, unknown>) {
      if (name !== 'create_guardian_withdrawal') return Promise.resolve({ data: null, error: null });
      const guardianId = args.p_guardian_id;
      const amount = args.p_amount;
      const guardian = getMockTableRows('guardian_users').find((row) => String(row.id) === String(guardianId));
      if (!guardian || typeof amount !== 'number' || guardian.available_commission < amount) return Promise.resolve({ data: null, error: { message: 'INSUFFICIENT_BALANCE_OR_GUARDIAN' } });
      guardian.available_commission -= amount;
      const row = { id: nextMockId('guardian_withdrawals'), guardian_id: guardianId, amount, actual_amount: amount, fee: 0, status: 'pending', created_at: new Date().toISOString() };
      getMockTableRows('guardian_withdrawals').push(row);
      return Promise.resolve({ data: { withdrawalId: row.id, amount }, error: null });
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
