# CloudBase 云托管 Dockerfile - Next.js 应用
# 使用 Node.js 20 镜像（与 CloudBase 运行时一致）
FROM node:20-alpine AS base

# 安装 pnpm 和 bash
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache bash

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --prefer-frozen-lockfile --prefer-offline --prod=false

# 复制所有源码
COPY . .

# 构建应用
RUN pnpm next build

# 构建 server bundle
RUN pnpm tsup src/server.mts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

# 清理 dev 依赖，减小镜像体积
RUN pnpm prune --prod

# 运行阶段
FROM node:20-alpine AS runner

RUN apk add --no-cache bash curl

WORKDIR /app

# 从构建阶段复制必要文件
COPY --from=base /app/next.config.ts ./
COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/dist ./dist
COPY --from=base /app/scripts ./scripts

# 与 start.sh 中的 DEPLOY_RUN_PORT 保持一致
ENV DEPLOY_RUN_PORT=5000
ENV PORT=5000
ENV NODE_ENV=production
ENV DEPLOY_ENV=PROD

EXPOSE 5000

# 使用 bash 运行启动脚本
CMD ["bash", "./scripts/start.sh"]