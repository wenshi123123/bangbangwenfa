import { getSupabaseAdmin } from '@/storage/database/supabase-client';

function calculateExpiry(baseDate: Date, months: number): Date {
  const result = new Date(baseDate);
  const originalDate = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== originalDate) result.setDate(0);
  return result;
}

function parsePackageList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * 统一处理续费支付成功：回调和主动查单必须共用这条幂等路径。
 */
export async function handleRenewalPaymentSuccess(
  tradeNo: string,
  orderNo: string,
  paidAmount: number,
  allowClosedRecovery = false,
): Promise<{ success: boolean; paidNow?: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data: order, error: orderError } = await supabase
    .from('lawyer_renew_orders')
    .select('*, lawyers(id, user_id, member_expires_at, selected_packages)')
    .eq('order_no', orderNo)
    .single();

  if (orderError || !order) return { success: false, error: '续费订单不存在' };
  if (Number(order.package_price) !== paidAmount) return { success: false, error: '支付金额不一致' };

  const alreadyPaid = order.payment_status === 'paid';
  if (!alreadyPaid && !['pending', 'paying'].includes(order.payment_status) && !(allowClosedRecovery && order.payment_status === 'closed')) {
    return { success: false, error: '订单状态不允许完成支付' };
  }

  const membershipPackage = String(order.package_id).startsWith('criminal_') ? 'criminal' : 'civil';
  const { data: existingMembership } = await supabase
    .from('membership_records')
    .select('id, expires_at')
    .eq('source_order_no', order.order_no)
    .maybeSingle();
  const { data: activeMembership } = await supabase
    .from('membership_records')
    .select('expires_at')
    .eq('lawyer_id', order.lawyer_id)
    .eq('package_type', membershipPackage)
    .in('status', ['active', 'trial'])
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const packageExpiry = order.expires_at || existingMembership?.expires_at || activeMembership?.expires_at;
  let newExpiresAt: Date;
  if (packageExpiry && alreadyPaid) {
    newExpiresAt = new Date(packageExpiry);
  } else if (packageExpiry) {
    const currentExpires = new Date(packageExpiry);
    newExpiresAt = currentExpires > new Date() ? calculateExpiry(currentExpires, order.months) : calculateExpiry(new Date(), order.months);
  } else {
    newExpiresAt = calculateExpiry(new Date(), order.months);
  }

  if (!alreadyPaid) {
    const { error } = await supabase
      .from('lawyer_renew_orders')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString(), trade_no: tradeNo, expires_at: newExpiresAt.toISOString(), payment_completed_at: new Date().toISOString() })
      .eq('order_no', orderNo)
      .in('payment_status', ['pending', 'paying']);
    if (error) return { success: false, error: '更新续费订单失败' };
  }

  if (!existingMembership) {
    const { error } = await supabase.from('membership_records').insert({
      lawyer_id: order.lawyer_id,
      package_type: membershipPackage,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: newExpiresAt.toISOString(),
      source_type: 'renewal',
      source_order_no: order.order_no,
      is_complimentary: false,
    });
    if (error && error.code !== '23505') return { success: false, error: '更新套餐会员资格失败' };
  }

  const { data: activeMemberships } = await supabase
    .from('membership_records')
    .select('package_type, expires_at')
    .eq('lawyer_id', order.lawyer_id)
    .in('status', ['active', 'trial']);
  const maxExpiresAt = (activeMemberships || [])
    .map((item) => new Date(item.expires_at).getTime())
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), newExpiresAt.getTime());
  const existingPackages = parsePackageList(order.lawyers?.selected_packages);
  const packageLabel = membershipPackage === 'criminal' ? 'criminal_premium' : 'civil_premium';
  const selectedPackages = [...new Set([...existingPackages, packageLabel])];
  const { data: lawyerData, error: lawyerError } = await supabase
    .from('lawyers')
    .update({ member_expires_at: new Date(maxExpiresAt).toISOString(), selected_packages: JSON.stringify(selectedPackages), membership_status: 'normal', updated_at: new Date().toISOString() })
    .eq('id', order.lawyer_id)
    .select('user_id')
    .single();
  if (lawyerError) return { success: false, error: '更新律师会员到期时间失败' };

  if (lawyerData) {
    await supabase.from('lawyer_applications').update({ member_expires_at: new Date(maxExpiresAt).toISOString(), updated_at: new Date().toISOString() }).eq('user_id', lawyerData.user_id).eq('review_status', 'approved');
  }
  return { success: true, paidNow: !alreadyPaid };
}
