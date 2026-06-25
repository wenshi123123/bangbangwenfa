#!/bin/bash
# ==========================================
# 帮帮问法 - 一键部署脚本 (适用于新服务器)
# ==========================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./pnpm-cmd.sh
. "${SCRIPT_DIR}/pnpm-cmd.sh"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   帮帮问法 - 一键部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}提示: 建议使用 sudo 运行以获得完整权限${NC}"
fi

# 1. 安装基础软件
echo -e "${GREEN}[1/6] 安装基础软件...${NC}"
apt update && apt upgrade -y
apt install -y curl git unzip nginx

# 2. 安装 Node.js 18
echo -e "${GREEN}[2/6] 安装 Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
echo -e "${GREEN}   Node.js 版本: $(node -v)${NC}"

# 3. 安装 PNPM
echo -e "${GREEN}[3/6] 安装 PNPM...${NC}"
if command -v pnpm >/dev/null 2>&1; then
    echo -e "${GREEN}   PNPM 版本: $(pnpm -v)${NC}"
elif command -v corepack >/dev/null 2>&1; then
    corepack enable
    echo -e "${GREEN}   PNPM 已通过 corepack 就绪${NC}"
else
    echo -e "${YELLOW}   PNPM 将通过脚本回退机制使用${NC}"
fi

# 4. 安装项目依赖
echo -e "${GREEN}[4/6] 安装项目依赖...${NC}"
pnpm_cmd install

# 5. 配置环境变量
echo -e "${GREEN}[5/6] 配置环境变量...${NC}"
if [ ! -f ".env.production" ]; then
    cp .env.production.example .env.production
    echo -e "${YELLOW}   已创建 .env.production，请编辑配置后继续${NC}"
fi

# 6. 构建并启动
echo -e "${GREEN}[6/6] 构建并启动服务...${NC}"
pnpm_cmd run build

# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js
pm2 save

# 配置开机自启
pm2 startup

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}查看服务状态:${NC}"
echo -e "  pm2 status"
echo ""
echo -e "${YELLOW}查看日志:${NC}"
echo -e "  pm2 logs bangbang-law-app"
echo ""
echo -e "${YELLOW}重启服务:${NC}"
echo -e "  pm2 restart bangbang-law-app"
echo ""
