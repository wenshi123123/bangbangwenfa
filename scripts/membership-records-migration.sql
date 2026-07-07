-- 律师会员记录表迁移
-- 用于记录每一次开通 / 续费的会员套餐

CREATE TABLE IF NOT EXISTS membership_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    package_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_records_lawyer_id ON membership_records(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_membership_records_status ON membership_records(status);
CREATE INDEX IF NOT EXISTS idx_membership_records_expires_at ON membership_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_membership_records_created_at ON membership_records(created_at DESC);

ALTER TABLE membership_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON membership_records
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
