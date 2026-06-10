#!/bin/bash
# 预部署检查脚本
# 在部署前运行，确保 schema.ts 变更不会触发扣子平台迁移错误

set -e

echo "=== 预部署检查 ==="
echo ""

# 1. 检查是否启用了数据库迁移
echo "[1/4] 检查数据库迁移配置..."
if [ -f ".cozerc" ]; then
    if grep -q '"autoMigrate": false' .cozerc || grep -q '"syncSchema": false' .cozerc; then
        echo "✓ .cozerc 中已禁用自动迁移"
    else
        echo "⚠ .cozerc 存在但未禁用迁移，可能导致部署失败"
    fi
else
    echo "⚠ .cozerc 不存在，建议添加配置禁用迁移"
fi
echo ""

# 2. 检查 schema.ts 中是否有问题的表定义
echo "[2/4] 检查 schema.ts 中的敏感表..."
SENSITIVE_TABLES=("lawyers" "admin_users" "guardian_users")
for table in "${SENSITIVE_TABLES[@]}"; do
    if grep -q "^export const $table = pgTable" src/storage/database/shared/schema.ts; then
        echo "⚠ 发现 $table 表定义，可能需要检查"
    else
        echo "✓ $table 表已禁用或不存在"
    fi
done
echo ""

# 3. 检查构建是否成功
echo "[3/4] 检查构建..."
if [ -d ".next" ]; then
    echo "✓ .next 目录存在"
else
    echo "⚠ .next 目录不存在，建议先运行构建"
fi
echo ""

# 4. 总结
echo "[4/4] 总结"
echo "============"
echo "如果所有检查通过，可以安全部署。"
echo "如果有任何警告，请先解决后再部署。"
echo ""
echo "建议：在扣子平台控制台中禁用'数据库自动迁移'功能。"
