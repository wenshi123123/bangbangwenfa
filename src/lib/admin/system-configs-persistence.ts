export type SystemConfigSaveItem = {
  key: string;
  value: string;
};

export function buildSystemConfigSaveRows(
  payload: { configs?: SystemConfigSaveItem[]; key?: string; value?: string }
): Array<{ config_key: string; config_value: string; updated_at: string }> {
  const now = new Date().toISOString();

  if (Array.isArray(payload.configs)) {
    return payload.configs
      .filter((item) => !!item?.key)
      .map((item) => ({
        config_key: item.key,
        config_value: item.value,
        updated_at: now,
      }));
  }

  if (payload.key) {
    return [{
      config_key: payload.key,
      config_value: payload.value ?? '',
      updated_at: now,
    }];
  }

  return [];
}

export function hasSavePayload(payload: { configs?: SystemConfigSaveItem[]; key?: string }): boolean {
  return Array.isArray(payload.configs) ? payload.configs.length > 0 : !!payload.key;
}
