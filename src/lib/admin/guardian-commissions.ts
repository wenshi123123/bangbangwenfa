export function isGuardianCommissionNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === 'PGRST116' ||
    maybeError.message === 'JSON object requested, multiple (or no) rows returned'
  );
}
