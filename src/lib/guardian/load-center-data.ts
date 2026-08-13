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
  timeoutMs: number,
  required = false,
): Promise<{ value?: T; error?: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = request(url, { signal: controller.signal }).then(readSuccessfulJson<T>);
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          const error = new GuardianCenterLoadTimeoutError();
          controller.abort(error);
          reject(error);
        }, timeoutMs);
      });
      return { value: await Promise.race([response, timeout]) };
    } catch (error) {
      lastError = error;
      if (required && error instanceof GuardianCenterAuthError) throw error;
      if (
        error instanceof GuardianCenterLoadTimeoutError
        || error instanceof GuardianCenterAuthError
        || attempt === 1
      ) break;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
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
  const config = requestWithRetry<unknown>(
    request,
    '/api/guardian/withdraw?action=config',
    timeoutMs,
  ).then((result) => ({
    value: result.value as TWithdrawConfig | undefined,
    error: result.error,
  }));

  // Each endpoint owns its timeout. One slow optional report must not abort
  // the profile request or turn the whole page into a generic network error.
  const [profileResult, commissionsResult, inviteesResult, withdrawalsResult, withdrawConfigResult] = await Promise.all([
    requestWithRetry<TProfile>(request, '/api/guardian/profile', timeoutMs, true),
    requestWithRetry<TCommissions>(request, '/api/guardian/commissions', timeoutMs),
    requestWithRetry<TInvitees>(request, '/api/guardian/invites', timeoutMs),
    requestWithRetry<TWithdrawals>(request, '/api/guardian/withdrawals', timeoutMs),
    config,
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
}
