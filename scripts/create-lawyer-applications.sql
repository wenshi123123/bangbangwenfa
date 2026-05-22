-- 创建律师入驻申请表
CREATE TABLE IF NOT EXISTS lawyer_applications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    law_firm VARCHAR(200),
    license_number VARCHAR(50),
    specialties TEXT, -- JSON string
    education VARCHAR(50),
    phone VARCHAR(20),
    wechat VARCHAR(100),
    license_images TEXT[], -- 数组
    id_card_images TEXT[], -- 数组
    education_images TEXT[], -- 数组
    package_type VARCHAR(50),
    package_price INTEGER, -- 单位：分
    selected_packages TEXT, -- JSON string
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed
    review_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    review_remark TEXT,
    order_no VARCHAR(100),
    wechat_transaction_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_lawyer_applications_user_id ON lawyer_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_applications_order_no ON lawyer_applications(order_no);
CREATE INDEX IF NOT EXISTS idx_lawyer_applications_payment_status ON lawyer_applications(payment_status);

-- 启用 RLS（行级安全）
ALTER TABLE lawyer_applications ENABLE ROW LEVEL SECURITY;

-- 允许 service role 完全访问
CREATE POLICY IF NOT EXISTS "Allow service role full access" ON lawyer_applications FOR ALL USING (true) WITH CHECK (true);
