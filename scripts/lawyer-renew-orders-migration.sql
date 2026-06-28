-- 律师续费订单表迁移
-- 可在 Supabase SQL Editor 中执行

CREATE TABLE IF NOT EXISTS lawyer_renew_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    order_no VARCHAR(50) UNIQUE NOT NULL,
    package_id VARCHAR(50) NOT NULL,
    package_price INTEGER NOT NULL,
    months INTEGER NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    trade_no VARCHAR(100),
    expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lawyer_renew_orders_lawyer ON lawyer_renew_orders(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_renew_orders_user ON lawyer_renew_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_renew_orders_order_no ON lawyer_renew_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_lawyer_renew_orders_status ON lawyer_renew_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_lawyer_renew_orders_created ON lawyer_renew_orders(created_at DESC);

ALTER TABLE lawyer_renew_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON lawyer_renew_orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
