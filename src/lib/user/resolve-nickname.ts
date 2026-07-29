type UserLookupClient = {
  from: (table: string) => any;
};

/**
 * 订单和通知展示使用账户昵称；没有登录用户或昵称时才显示匿名用户。
 */
export async function resolveUserNickname(
  supabase: UserLookupClient,
  userId: string | number | null | undefined,
): Promise<string> {
  if (!userId) return '匿名用户';

  const { data, error } = await supabase
    .from('users')
    .select('nickname')
    .eq('id', String(userId))
    .maybeSingle();

  if (error) {
    console.warn('读取用户昵称失败:', error);
    return '匿名用户';
  }

  const nickname = typeof data?.nickname === 'string' ? data.nickname.trim() : '';
  return nickname || '匿名用户';
}
