-- 律师入驻与续费后台价格配置（单位：分）
-- 此迁移将六个指定套餐初始化为已确认的价格；后续可在后台价格管理中调整。
WITH target_prices(category, plan_id, plan_name, price, description) AS (
  VALUES
  ('lawyer', 'civil_premium', '民事律师（臻选）', 500000, '律师入驻费用'),
  ('lawyer', 'criminal_premium', '刑事律师（臻选）', 800000, '律师入驻费用'),
  ('lawyer_renewal', 'civil_renew_quarter', '民事律师季卡', 1000000, '续费 3 个月'),
  ('lawyer_renewal', 'civil_renew_year', '民事律师年卡', 1000000, '续费 12 个月'),
  ('lawyer_renewal', 'criminal_renew_quarter', '刑事律师季卡', 1000000, '续费 3 个月'),
  ('lawyer_renewal', 'criminal_renew_year', '刑事律师年卡', 1000000, '续费 12 个月')
), updated AS (
  UPDATE price_configs AS existing
  SET plan_name = target.plan_name,
      price = target.price,
      description = target.description,
      is_active = true
  FROM target_prices AS target
  WHERE existing.category = target.category
    AND existing.plan_id = target.plan_id
  RETURNING existing.category, existing.plan_id
)
INSERT INTO price_configs (category, plan_id, plan_name, price, description, is_active)
SELECT target.category, target.plan_id, target.plan_name, target.price, target.description, true
FROM target_prices AS target
WHERE NOT EXISTS (
  SELECT 1
  FROM price_configs existing
  WHERE existing.category = target.category AND existing.plan_id = target.plan_id
);
