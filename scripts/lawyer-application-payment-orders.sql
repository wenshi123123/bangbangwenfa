-- 律师入驻支付订单表迁移（阶段三）
-- 本迁移仅新增独立订单表、索引与权限；不会修改历史申请或续费订单数据。

CREATE TABLE IF NOT EXISTS lawyer_application_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id INTEGER NOT NULL REFERENCES lawyer_applications(id) ON DELETE RESTRICT,
    -- lawyer_applications.user_id 是历史文本字段；保存创建订单时的归属快照，避免改动旧表类型。
    user_id VARCHAR(50) NOT NULL,
    order_no VARCHAR(100) NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'creating'
        CHECK (status IN ('creating', 'pending', 'paid', 'failed', 'expired')),
    prepay_id VARCHAR(200),
    wechat_transaction_id VARCHAR(100),
    payment_expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT lawyer_application_payment_orders_order_no_key UNIQUE (order_no)
);

-- 一个申请在创建微信支付请求或待支付期间只能保留一笔有效订单。
CREATE UNIQUE INDEX IF NOT EXISTS idx_lawyer_application_payment_orders_one_active
    ON lawyer_application_payment_orders (application_id)
    WHERE status IN ('creating', 'pending');

CREATE INDEX IF NOT EXISTS idx_lawyer_application_payment_orders_user_id
    ON lawyer_application_payment_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_application_payment_orders_status
    ON lawyer_application_payment_orders (status);
CREATE INDEX IF NOT EXISTS idx_lawyer_application_payment_orders_created_at
    ON lawyer_application_payment_orders (created_at DESC);

-- 订单仅可由服务端使用 service_role 访问；浏览器角色不得经 Data API 直接读取或写入。
ALTER TABLE lawyer_application_payment_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE lawyer_application_payment_orders FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE lawyer_application_payment_orders TO service_role;

CREATE POLICY "Service role manages lawyer application payment orders"
    ON lawyer_application_payment_orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 迁移后验证：仅读取系统目录和旧申请表计数，不写入任何既有数据。
SELECT
    to_regclass('public.lawyer_application_payment_orders') AS payment_orders_table,
    (SELECT COUNT(*) FROM lawyer_applications) AS lawyer_applications_row_count;

SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_select,
    has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_can_select,
    has_table_privilege('service_role', c.oid, 'SELECT') AS service_role_can_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'lawyer_application_payment_orders';

-- 回滚（仅在尚未有任何新订单写入时执行）：
-- DROP TABLE IF EXISTS lawyer_application_payment_orders;
