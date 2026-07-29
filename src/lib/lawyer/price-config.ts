type PriceConfigClient = {
  from: (table: string) => any;
};

type PriceConfig = {
  plan_id: string;
  plan_name: string;
  price: number | string;
};

export async function loadConfiguredPrices(
  supabase: PriceConfigClient,
  category: string,
  planIds: readonly string[],
) {
  const { data, error } = await supabase
    .from('price_configs')
    .select('plan_id, plan_name, price')
    .eq('category', category)
    .eq('is_active', true)
    .in('plan_id', [...planIds]);

  if (error) {
    throw new Error('读取价格配置失败');
  }

  const prices = new Map(
    ((data || []) as PriceConfig[]).map((item) => [item.plan_id, {
      ...item,
      price: Number(item.price),
    }]),
  );
  const missing = planIds.filter((planId) => !Number.isFinite(prices.get(planId)?.price));
  if (missing.length > 0) {
    throw new Error('套餐价格尚未在后台配置');
  }

  return prices;
}

export async function loadLawyerPackagePrices(supabase: PriceConfigClient, planIds: readonly string[]) {
  return loadConfiguredPrices(supabase, 'lawyer', planIds);
}

export async function loadRenewalPackagePrice(supabase: PriceConfigClient, planId: string) {
  const prices = await loadConfiguredPrices(supabase, 'lawyer_renewal', [planId]);
  return prices.get(planId)!;
}
