export interface SystemConfigSeed {
  config_key: string;
  config_value: string;
  config_type: string;
  config_group: string;
  description: string;
  is_public: boolean;
}

export const DEFAULT_SYSTEM_CONFIGS: SystemConfigSeed[] = [
  {
    config_key: 'site_name',
    config_value: '帮帮问法',
    config_type: 'text',
    config_group: 'basic',
    description: '网站名称',
    is_public: true,
  },
  {
    config_key: 'site_slogan',
    config_value: 'AI千问 不如律师一言',
    config_type: 'text',
    config_group: 'basic',
    description: '首页标语',
    is_public: true,
  },
  {
    config_key: 'support_hours',
    config_value: '工作日 9:00-18:00',
    config_type: 'text',
    config_group: 'contact',
    description: '客服服务时间',
    is_public: true,
  },
  {
    config_key: 'customer_service_phone',
    config_value: '',
    config_type: 'text',
    config_group: 'contact',
    description: '客服电话',
    is_public: true,
  },
  {
    config_key: 'customer_service_wechat',
    config_value: '',
    config_type: 'text',
    config_group: 'contact',
    description: '客服微信',
    is_public: true,
  },
];

export const SYSTEM_CONFIGS_BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS system_configs (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type VARCHAR(20) NOT NULL DEFAULT 'text',
  config_group VARCHAR(50) NOT NULL DEFAULT 'other',
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_configs_group ON system_configs(config_group);
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(config_key);

ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_configs'
      AND policyname = 'Allow service role full access'
  ) THEN
    CREATE POLICY "Allow service role full access" ON system_configs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

INSERT INTO system_configs (config_key, config_value, config_type, config_group, description, is_public)
VALUES
  ${DEFAULT_SYSTEM_CONFIGS.map((config) => `(
    '${config.config_key}',
    '${config.config_value.replace(/'/g, "''")}',
    '${config.config_type}',
    '${config.config_group}',
    '${config.description.replace(/'/g, "''")}',
    ${config.is_public}
  )`).join(',\n  ')}
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  config_type = EXCLUDED.config_type,
  config_group = EXCLUDED.config_group,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();
`;

export function isMissingSystemConfigsTableError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = error.message || '';
  return error.code === '42P01' || /system_configs|schema cache|does not exist/i.test(message);
}
