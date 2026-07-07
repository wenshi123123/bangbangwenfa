-- 律师会员操作日志表迁移

CREATE TABLE IF NOT EXISTS membership_logs (
    id BIGSERIAL PRIMARY KEY,
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    package_type VARCHAR(20),
    is_trial BOOLEAN DEFAULT FALSE,
    duration_days INTEGER,
    old_expires_at TIMESTAMPTZ,
    new_expires_at TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_logs_lawyer_id ON membership_logs(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_membership_logs_created_at ON membership_logs(created_at DESC);

ALTER TABLE membership_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to membership_logs" ON membership_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);
