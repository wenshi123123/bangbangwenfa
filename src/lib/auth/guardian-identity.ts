import type { AuthResult } from './middleware';

interface GuardianLookupClient {
  from(table: string): any;
}

/**
 * Resolve the guardian record from the authenticated identity.
 *
 * A user can reach the guardian center with either the main-site user token
 * or the legacy guardian-specific token. The client-provided guardian id is
 * never used for authorization; normal user tokens are mapped through the
 * server-side users -> guardian_users relation.
 */
export async function resolveGuardianId(
  auth: AuthResult,
  database: GuardianLookupClient,
): Promise<number | null> {
  if (!auth.success) return null;

  if (auth.userType === 'guardian' && auth.guardianId) {
    return auth.guardianId;
  }

  if (!auth.userId) return null;

  const { data, error } = await database
    .from('guardian_users')
    .select('id')
    .eq('user_id', String(auth.userId))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}
