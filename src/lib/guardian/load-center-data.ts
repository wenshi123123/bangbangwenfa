import { UI_LOAD_TIMEOUT_MS } from '@/lib/ui/with-timeout';

type GuardianApiRequest = (
  url: string,
  options?: { signal?: AbortSignal },
) => Promise<Response>;

export class GuardianCenterLoadTimeoutError extends Error {
  constructor() {
    super('数据加载超时，请检查网络后重试');
    this.name = 'GuardianCenterLoadTimeoutError';
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
  if (!response.ok) throw new Error(`请求失败（${response.status}）`);
  const data: unknown = await response.json();
  if (!isSuccessfulResponse(data)) throw new Error('接口返回异常');
  if (!data.success) {
    throw new Error(typeof data.error === 'string' ? data.error : '接口返回异常');
  }
  return data.data as T;
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
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new GuardianCenterLoadTimeoutError();
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  const config = request('/api/guardian/withdraw?action=config', { signal: controller.signal })
    .then(async (response) => {
      const data: unknown = await response.json();
      if (!isSuccessfulResponse(data) || !data.success) return undefined;
      return data.data as TWithdrawConfig;
    })
    .catch((error) => {
      if (!controller.signal.aborted) console.error('获取提现配置失败', error);
      return undefined;
    });

  const data = Promise.all([
    request('/api/guardian/profile', { signal: controller.signal }).then(readSuccessfulJson<TProfile>),
    request('/api/guardian/commissions', { signal: controller.signal }).then(readSuccessfulJson<TCommissions>),
    request('/api/guardian/invites', { signal: controller.signal }).then(readSuccessfulJson<TInvitees>),
    request('/api/guardian/withdrawals', { signal: controller.signal }).then(readSuccessfulJson<TWithdrawals>),
    config,
  ]);

  try {
    const [profile, commissions, invitees, withdrawals, withdrawConfig] = await Promise.race([
      data,
      timeout,
    ]);
    return { profile, commissions, invitees, withdrawals, withdrawConfig };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
