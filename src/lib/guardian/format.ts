export function normalizeGuardianNumber(value: unknown): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function formatGuardianCents(value: unknown): string {
  return (normalizeGuardianNumber(value) / 100).toFixed(2);
}
