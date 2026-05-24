-- ============================================
-- 帮帮问法 - 完整数据库初始化脚本
-- 创建日期: 2026-05-19
-- 说明: 包含所有业务表结构
-- ============================================

-- ============================================
-- 1. 短信验证码表 (已存在，但仍保留以便参考)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'login',
    ip VARCHAR(50),
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_codes_type ON sms_verification_codes(type);
CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_verification_codes(expires_at);

ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON sms_verification_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 2. 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    nickname VARCHAR(100),
    avatar_url TEXT,
    source VARCHAR(20) DEFAULT 'register',
    invite_code VARCHAR(50),
    inviter_id UUID,
    status VARCHAR(20) DEFAULT 'active',
    login_count INTEGER DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_inviter ON users(inviter_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 3. 守护者表
-- ============================================
CREATE TABLE IF NOT EXISTS guardian_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    openid VARCHAR(100) UNIQUE,
    nickname VARCHAR(100) DEFAULT '守护者',
    avatar_url TEXT,
    phone VARCHAR(20) UNIQUE,
    wechat_account VARCHAR(100),
    invite_code VARCHAR(50) UNIQUE,
    total_invites INTEGER DEFAULT 0,
    valid_invites INTEGER DEFAULT 0,
    total_commission DECIMAL(12, 2) DEFAULT 0,
    available_commission DECIMAL(12, 2) DEFAULT 0,
    withdrawn_commission DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardian_user_id ON guardian_users(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_openid ON guardian_users(openid);
CREATE INDEX IF NOT EXISTS idx_guardian_phone ON guardian_users(phone);
CREATE INDEX IF NOT EXISTS idx_guardian_invite_code ON guardian_users(invite_code);

ALTER TABLE guardian_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON guardian_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 4. 守护者分成记录表
-- ============================================
CREATE TABLE IF NOT EXISTS guardian_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardian_id UUID NOT NULL REFERENCES guardian_users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES consult_orders(id) ON DELETE SET NULL,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5, 4) DEFAULT 0.20,
    status VARCHAR(20) DEFAULT 'pending',
    is_refunded BOOLEAN DEFAULT FALSE,
    refunded_amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_guardian ON guardian_commissions(guardian_id);
CREATE INDEX IF NOT EXISTS idx_commissions_order ON guardian_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON guardian_commissions(status);

ALTER TABLE guardian_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON guardian_commissions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 5. 守护者提现记录表
-- ============================================
CREATE TABLE IF NOT EXISTS guardian_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardian_id UUID NOT NULL REFERENCES guardian_users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    bank_username VARCHAR(100),
    remark TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_guardian ON guardian_withdrawals(guardian_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON guardian_withdrawals(status);

ALTER TABLE guardian_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON guardian_withdrawals
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 6. 律师表
-- ============================================
CREATE TABLE IF NOT EXISTS lawyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100),
    nickname VARCHAR(100),
    avatar_url TEXT,
    real_name VARCHAR(50),
    id_card VARCHAR(20),
    id_card_front TEXT,
    id_card_back TEXT,
    license_no VARCHAR(50),
    license_photo TEXT,
    province VARCHAR(50),
    city VARCHAR(50),
    specialization TEXT,
    specialties TEXT[],
    bio TEXT,
    wechat VARCHAR(100),
    email VARCHAR(200),
    title VARCHAR(200),
    intro TEXT,
    working_years INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    is_available BOOLEAN DEFAULT TRUE,
    max_orders INTEGER DEFAULT 50,
    current_orders INTEGER DEFAULT 0,
    rating DECIMAL(3,1) DEFAULT 5.0,
    response_rate INTEGER DEFAULT 100,
    review_status VARCHAR(20) DEFAULT 'pending',
    review_remark TEXT,
    membership_status VARCHAR(20) DEFAULT 'normal',
    member_expires_at TIMESTAMP WITH TIME ZONE,
    status_updated_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lawyers_phone ON lawyers(phone);
CREATE INDEX IF NOT EXISTS idx_lawyers_status ON lawyers(status);
CREATE INDEX IF NOT EXISTS idx_lawyers_review_status ON lawyers(review_status);

ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON lawyers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 7. 律师资料修改记录表
-- ============================================
CREATE TABLE IF NOT EXISTS lawyer_profile_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_id INTEGER,
    admin_remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_revisions_lawyer ON lawyer_profile_revisions(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_revisions_status ON lawyer_profile_revisions(status);

ALTER TABLE lawyer_profile_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON lawyer_profile_revisions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 8. 咨询订单表
-- ============================================
CREATE TABLE IF NOT EXISTS consult_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_wechat VARCHAR(100),
    case_type VARCHAR(50),
    case_title VARCHAR(200),
    case_description TEXT,
    service_type VARCHAR(100),
    service_price DECIMAL(12, 2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending',
    status VARCHAR(20) DEFAULT 'pending',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL,
    openid VARCHAR(100),
    category VARCHAR(20) DEFAULT 'criminal',
    invite_code VARCHAR(50),
    transaction_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_no ON consult_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_user ON consult_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_lawyer ON consult_orders(assigned_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON consult_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON consult_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_category ON consult_orders(category);
CREATE INDEX IF NOT EXISTS idx_orders_created ON consult_orders(created_at);

ALTER TABLE consult_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON consult_orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 9. 通知表
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 10. 价格配置表
-- ============================================
CREATE TABLE IF NOT EXISTS price_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(20) NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_category ON price_configs(category);
CREATE INDEX IF NOT EXISTS idx_price_active ON price_configs(is_active);

ALTER TABLE price_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON price_configs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 11. 案件类型表
-- ============================================
CREATE TABLE IF NOT EXISTS case_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(20) DEFAULT 'criminal',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_types_code ON case_types(code);
CREATE INDEX IF NOT EXISTS idx_case_types_category ON case_types(category);
CREATE INDEX IF NOT EXISTS idx_case_types_sort ON case_types(sort_order);

ALTER TABLE case_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON case_types
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 12. 服务类型表
-- ============================================
CREATE TABLE IF NOT EXISTS service_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    price DECIMAL(12, 2) DEFAULT 0,
    category VARCHAR(20) DEFAULT 'consult',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_types_code ON service_types(code);
CREATE INDEX IF NOT EXISTS idx_service_types_category ON service_types(category);
CREATE INDEX IF NOT EXISTS idx_service_types_sort ON service_types(sort_order);

ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON service_types
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 13. 管理员表
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    role VARCHAR(20) DEFAULT 'admin',
    permissions TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    last_login_ip VARCHAR(50),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON admins
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 14. 管理员操作日志表
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB DEFAULT '{}',
    ip VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON admin_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 15. 初始化默认数据
-- ============================================

-- 插入默认管理员 (密码: admin123)
-- 密码hash是 bcrypt hash of 'admin123'
INSERT INTO admins (username, password_hash, nickname, role, permissions)
VALUES (
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
    '系统管理员',
    'super_admin',
    ARRAY['all']
) ON CONFLICT (username) DO NOTHING;

-- 插入默认案件类型
INSERT INTO case_types (name, code, description, icon, category, sort_order) VALUES
('诈骗类案件', 'fraud', '诈骗罪、合同诈骗等', 'warning', 'criminal', 1),
('盗窃类案件', 'theft', '盗窃罪、偷盗等', 'lock', 'criminal', 2),
('故意伤害', 'assault', '故意伤害罪、寻衅滋事等', 'fire', 'criminal', 3),
('毒品犯罪', 'drugs', '贩卖毒品、非法持有毒品等', 'alert', 'criminal', 4),
('经济犯罪', 'economy', '非法集资、传销等', 'trending-up', 'criminal', 5),
('交通犯罪', 'traffic', '危险驾驶、交通肇事等', 'car', 'criminal', 6),
('其他刑事', 'other', '其他刑事案件咨询', 'help-circle', 'criminal', 7),
('合同纠纷', 'contract', '合同签订、履行、违约等', 'file-text', 'civil', 101),
('财产纠纷', 'property', '财产归属、分割等', 'home', 'civil', 102),
('婚姻家庭', 'marriage', '离婚、抚养权、财产分割等', 'heart', 'civil', 103),
('继承纠纷', 'inheritance', '遗产继承、遗嘱效力等', 'book-open', 'civil', 104),
('民间借贷', 'loan', '借款纠纷、利息计算等', 'dollar-sign', 'civil', 105),
('劳动纠纷', 'labor', '劳动合同、工资拖欠等', 'briefcase', 'civil', 106),
('交通事故', 'traffic_accident', '交通事故责任、赔偿等', 'truck', 'civil', 107),
('医疗纠纷', 'medical', '医疗事故、医患纠纷等', 'activity', 'civil', 108),
('其他民事', 'other_civil', '其他民事纠纷咨询', 'help-circle', 'civil', 109)
ON CONFLICT (code) DO NOTHING;

-- 插入默认服务类型
INSERT INTO service_types (name, code, description, price, sort_order) VALUES
('电话咨询', 'phone', '15分钟专业电话咨询服务', 10000, 1),
('图文咨询', 'text', '在线图文咨询服务', 5000, 2),
('视频咨询', 'video', '30分钟视频面对面咨询', 20000, 3),
('文书服务', 'document', '法律文书起草、审核服务', 30000, 4),
('全权委托', 'full', '全权委托律师代理服务', 100000, 5)
ON CONFLICT (code) DO NOTHING;

-- 插入默认价格配置
INSERT INTO price_configs (category, plan_id, plan_name, price, description) VALUES
('criminal', 'criminal_consult', '刑事咨询基础套餐', 9900, '刑事案件咨询基础服务'),
('criminal', 'criminal_phone', '刑事电话咨询', 10000, '15分钟专业电话咨询'),
('civil', 'civil_consult', '民事咨询基础套餐', 6900, '民事纠纷咨询基础服务'),
('civil', 'civil_phone', '民事电话咨询', 10000, '15分钟专业电话咨询')
ON CONFLICT DO NOTHING;

-- ============================================
-- 16. 清理过期验证码的函数
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_sms_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sms_verification_codes
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '数据库初始化完成!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '已创建的表:';
    RAISE NOTICE '  - sms_verification_codes (短信验证码)';
    RAISE NOTICE '  - users (用户)';
    RAISE NOTICE '  - guardian_users (守护者)';
    RAISE NOTICE '  - guardian_commissions (守护者分成)';
    RAISE NOTICE '  - guardian_withdrawals (守护者提现)';
    RAISE NOTICE '  - lawyers (律师)';
    RAISE NOTICE '  - lawyer_profile_revisions (律师资料修改)';
    RAISE NOTICE '  - consult_orders (咨询订单)';
    RAISE NOTICE '  - notifications (通知)';
    RAISE NOTICE '  - price_configs (价格配置)';
    RAISE NOTICE '  - case_types (案件类型)';
    RAISE NOTICE '  - service_types (服务类型)';
    RAISE NOTICE '  - admins (管理员)';
    RAISE NOTICE '  - admin_logs (管理员日志)';
    RAISE NOTICE '';
    RAISE NOTICE '默认管理员账号: admin / admin123';
    RAISE NOTICE '请及时修改默认管理员密码!';
END $$;
