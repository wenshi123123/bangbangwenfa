/**
 * 守护者邀请链接/验证接口的唯一参数契约。
 *
 * 新链接统一使用 `inviteCode`；`code` 仅用于兼容已经分享的旧二维码。
 */
export const GUARDIAN_INVITE_QUERY_PARAM = 'inviteCode';
export const LEGACY_GUARDIAN_INVITE_QUERY_PARAM = 'code';

export interface GuardianInviteInfo {
  id: number;
  nickname: string;
  avatar_url: string | null;
  invite_code: string;
}

export type GuardianInviteVerificationResponse =
  | { valid: true; guardian: GuardianInviteInfo }
  | { valid: false; error: string };

export function getGuardianInviteCode(searchParams: URLSearchParams): string {
  return (
    searchParams.get(GUARDIAN_INVITE_QUERY_PARAM) ||
    searchParams.get(LEGACY_GUARDIAN_INVITE_QUERY_PARAM) ||
    ''
  );
}

export function getGuardianInviteRegistrationPath(inviteCode: string): string {
  return `/register?${GUARDIAN_INVITE_QUERY_PARAM}=${encodeURIComponent(inviteCode)}`;
}
