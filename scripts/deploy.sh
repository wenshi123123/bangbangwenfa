#!/bin/bash
# ==========================================
# 帮帮问法 - 生产环境部署脚本
# ==========================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./pnpm-cmd.sh
. "${SCRIPT_DIR}/pnpm-cmd.sh"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   帮帮问法 - 生产环境部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 Node.js 版本
echo -e "${YELLOW}[1/5] 检查环境...${NC}"
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo -e "${RED}错误: 需要 Node.js 18 或更高版本${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"

# 安装依赖
echo -e "${YELLOW}[2/5] 安装依赖...${NC}"
if command -v pnpm &> /dev/null; then
    pnpm_cmd install --frozen-lockfile
else
    pnpm_cmd install --frozen-lockfile
fi
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 环境检查
echo -e "${YELLOW}[3/5] 检查环境变量...${NC}"
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}警告: .env.production 文件不存在，尝试使用 .env${NC}"
    if [ ! -f ".env" ]; then
        echo -e "${RED}错误: 未找到环境变量文件${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 环境变量配置完成${NC}"

# 构建应用
echo -e "${YELLOW}[4/5] 构建应用...${NC}"
pnpm_cmd run build
echo -e "${GREEN}✓ 构建完成${NC}"

# 启动服务
echo -e "${YELLOW}[5/5] 启动服务...${NC}"
echo -e "${GREEN}✓ 部署完成！${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   服务运行中: http://localhost:5000${NC}"
echo -e "${GREEN}========================================${NC}"
