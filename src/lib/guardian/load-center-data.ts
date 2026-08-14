import { UI_LOAD_TIMEOUT_MS } from '@/lib/ui/with-timeout';

type GuardianApiRequest = (
  url: string,
  options?: { signal?: AbortSignal },
) => Promise<Response>;

interface GuardianCacheProfile {
  id: number;
  nickname: string;
  invite_code: string;
}

export class GuardianCenterLoadTimeoutError extends Error {
  constructor() {
    super('数据加载超时，请检查网络后重试');
    this.name = 'GuardianCenterLoadTimeoutError';
  }
}

export class GuardianCenterAuthError extends Error {
  constructor() {
    super('登录已过期，请重新登录');
    this.name = 'GuardianCenterAuthError';
  }
}

export function persistGuardianCache(
  storage: Pick<Storage, 'setItem'>,
  guardian: GuardianCacheProfile,
): boolean {
  try {
    storage.setItem('guardian_user', JSON.stringify({
      id: guardian.id,
      nickname: guardian.nickname,
      invite_code: guardian.invite_code,
    }));
    return true;
  } catch {
    // 缓存只用于加快下次页面初始化，写入失败不能影响已加载的数据展示。
    return false;
  }
}

function isSuccessfulResponse(value: unknown): value is {
  success: boolean;
  data: unknown;
  error?: unknown;
} {
  return typeof value === 'object' && value !== null && 'success' in value && 'data' in value;
}

async function readSuccessfulJson<T>(response: Response): Promise<T> {
  if (response.status === 401 || response.status === 403) throw new GuardianCenterAuthError();
  if (!response.ok) throw new Error(`请求失败（${response.status}）`);
  const data: unknown = await response.json();
  if (!isSuccessfulResponse(data)) throw new Error('接口返回异常');
  if (!data.success) {
    throw new Error(typeof data.error === 'string' ? data.error : '接口返回异常');
  }
  return data.data as T;
}

async function requestWithRetry<T>(
  request: GuardianApiRequest,
  url: string,
  signal: AbortSignal,
  required = false,
): Promise<{ value?: T; error?: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return { value: await request(url, { signal }).then(readSuccessfulJson<T>) };
    } catch (error) {
      lastError = error;
      if (required && error instanceof GuardianCenterAuthError) throw error;
      if (signal.aborted || error instanceof GuardianCenterAuthError || attempt === 1) break;
    }
  }
  if (required && lastError) throw lastError;
  return { error: lastError instanceof Error ? lastError.message : '接口暂时不可用' };
}

export async function loadGuardianCenterData<
  TProfile,
  TCommissions,
  TInvitees,
  TWithdrawals,
  TWithdrawConfig,
>(
  request: GuardianApiRequest,
  timeoutMs = UI_LOAD_TIMEOUT_MS,
) {
  const profileController = new AbortController();
  const optionalController = new AbortController();
  const controller = profileController;
  let profileTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let optionalTimeoutId: ReturnType<typeof setTimeout> | undefined;
  const profileTimeout = new Promise<never>((_, reject) => {
    profileTimeoutId = setTimeout(() => {
      const error = new GuardianCenterLoadTimeoutError();
      controller.abort(error);
      optionalController.abort(error);
      reject(error);
    }, timeoutMs);
  });
  const optionalTimeout = new Promise<{
    value?: undefined;
    error: string;
  }[]>((resolve) => {
    optionalTimeoutId = setTimeout(() => {
      optionalController.abort(new GuardianCenterLoadTimeoutError());
      resolve([
        { error: '数据加载超时' },
        { error: '数据加载超时' },
        { error: '数据加载超时' },
        { value: undefined, error: '数据加载超时' },
      ]);
    }, timeoutMs);
  });

  const config = request('/api/guardian/withdraw?action=config', { signal: optionalController.signal })
    .then(async (response) => {
      const data: unknown = await response.json();
      if (!isSuccessfulResponse(data) || !data.success) return undefined;
      return data.data as TWithdrawConfig;
    })
    .catch((error) => {
      if (!optionalController.signal.aborted) console.error('获取提现配置失败', error);
      return undefined;
    });

  const profilePromise = requestWithRetry<TProfile>(request, '/api/guardian/profile', profileController.signal, true);
  const optionalPromise = Promise.all([
    requestWithRetry<TCommissions>(request, '/api/guardian/commissions', optionalController.signal),
    requestWithRetry<TInvitees>(request, '/api/guardian/invites', optionalController.signal),
    requestWithRetry<TWithdrawals>(request, '/api/guardian/withdrawals', optionalController.signal),
    config.then((value) => ({ value })),
  ]);

  try {
    // The profile is required to identify the guardian; secondary panels must
    // not block the whole page when one database query is slow.
    const profileResult = await Promise.race([profilePromise, profileTimeout]);
    const [commissionsResult, inviteesResult, withdrawalsResult, withdrawConfigResult] = await Promise.race([
      optionalPromise,
      optionalTimeout,
    ]);
    const profile = profileResult.value as TProfile;
    const errors = [commissionsResult, inviteesResult, withdrawalsResult]
      .map((result, index) => result.error ? `${['佣金', '邀请记录', '提现记录'][index]}：${result.error}` : '')
      .filter(Boolean);
    return {
      profile,
      commissions: (commissionsResult.value || []) as TCommissions,
      invitees: (inviteesResult.value || []) as TInvitees,
      withdrawals: (withdrawalsResult.value || []) as TWithdrawals,
      withdrawConfig: withdrawConfigResult.value,
      errors,
    };
  } finally {
    if (profileTimeoutId) clearTimeout(profileTimeoutId);
    if (optionalTimeoutId) clearTimeout(optionalTimeoutId);
  }
}
