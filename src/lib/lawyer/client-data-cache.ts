type CachedEntry<T> = { value: T; expiresAt: number };

const entries = new Map<string, CachedEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
export const LAWYER_DATA_CACHE_TTL = 30_000;

export async function getLawyerCachedData<T>(key: string, load: () => Promise<T>, ttl = LAWYER_DATA_CACHE_TTL): Promise<T> {
  const cached = entries.get(key) as CachedEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const request = load().then((value) => {
    entries.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
  }).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, request);
  return request;
}

export function invalidateLawyerCachedData(keyPrefix: string) {
  for (const key of entries.keys()) {
    if (key.startsWith(keyPrefix)) entries.delete(key);
  }
}
