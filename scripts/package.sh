#!/bin/bash

# 部署包打包脚本
# 用于在 Linux/macOS 系统上生成 deploy-package.zip

set -e

echo "=========================================="
echo "开始打包部署包..."
echo "=========================================="

# 定义要排除的文件/目录
EXCLUDE=(
  "node_modules/*"
  ".next/*"
  ".git/*"
  ".env"
  ".env.local"
  ".env.production"
  "*.pem"
  "*.p12"
  "*.key"
  "assets/*.pem"
  "assets/*.p12"
  "assets/*.key"
  ".vscode/*"
  ".idea/*"
  "*.log"
  "coverage/*"
  "dist/*"
  "build/*"
  "out/*"
  ".turbo/*"
  ".vercel/*"
  ".coze-logs/*"
  "public/download/*"
  "deploy-package.zip"
)

# 构建 zip 排除参数
ZIP_EXCLUDE=""
for item in "${EXCLUDE[@]}"; do
  ZIP_EXCLUDE="$ZIP_EXCLUDE --exclude=$item"
done

# 生成 ZIP 包
echo "正在打包文件..."
zip -r deploy-package.zip . $ZIP_EXCLUDE

echo "=========================================="
echo "✅ 打包完成！"
echo "部署包路径: $(pwd)/deploy-package.zip"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 下载 deploy-package.zip"
echo "2. 上传到扣子平台"
echo "3. 配置环境变量（参考 DEPLOYMENT_GUIDE.md）"
echo "=========================================="
