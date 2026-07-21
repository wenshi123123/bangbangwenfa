# CloudBase 云托管 Dockerfile - Next.js 应用
# 使用 Node.js 20 镜像（与 CloudBase 运行时一致）
FROM node:20-alpine AS base

# Next.js 将 NEXT_PUBLIC_* 写入客户端构建产物；它们必须在 `next build`
# 之前进入镜像，而不能只在 CloudBase 容器启动后再设置。
ARG NEXT_PUBLIC_STATIC_ASSET_ORIGIN
ARG NEXT_PUBLIC_DEPLOYMENT_ID
ENV NEXT_PUBLIC_STATIC_ASSET_ORIGIN=${NEXT_PUBLIC_STATIC_ASSET_ORIGIN}
ENV NEXT_PUBLIC_DEPLOYMENT_ID=${NEXT_PUBLIC_DEPLOYMENT_ID}

# 安装 pnpm 和 bash
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache bash

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖（含 devDependencies，用于构建）
RUN pnpm install --prefer-frozen-lockfile --prefer-offline --prod=false

# 复制所有源码（.dockerignore 会过滤掉不需要的文件）
COPY . .

# 构建应用。线上显式使用 webpack，保持与本地构建一致。
RUN if [ -z "$NEXT_PUBLIC_STATIC_ASSET_ORIGIN" ] || [ -z "$NEXT_PUBLIC_DEPLOYMENT_ID" ]; then \
      test -f ./static-release.env && . ./static-release.env; \
    fi && \
    test -n "$NEXT_PUBLIC_STATIC_ASSET_ORIGIN" && \
    test -n "$NEXT_PUBLIC_DEPLOYMENT_ID" && \
    rm -rf .next dist && \
    pnpm exec next build --webpack && \
    node scripts/write-static-release-manifest.mjs --write

# 静态文件是 Next 页面可用的必要条件；缺失时不要产出一个会返回裸 HTML 的镜像。
RUN test -d .next/static && test -n "$(find .next/static -type f -print -quit)"

# 构建 server bundle
RUN pnpm exec tsup src/server.mts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

# ===== 减小镜像体积的关键步骤 =====
# 清理 dev 依赖，只保留生产依赖
RUN pnpm prune --prod

# 重新安装 typescript 为 prod 依赖（next.config.ts 运行时需要）
RUN pnpm add -P typescript

# 清理 pnpm store 和 npm 缓存，减少镜像层大小
RUN rm -rf /root/.local/share/pnpm/store /root/.npm /tmp/*

# 运行阶段
FROM node:20-alpine AS runner

ARG NEXT_PUBLIC_STATIC_ASSET_ORIGIN
ARG NEXT_PUBLIC_DEPLOYMENT_ID
ENV NEXT_PUBLIC_STATIC_ASSET_ORIGIN=${NEXT_PUBLIC_STATIC_ASSET_ORIGIN}
ENV NEXT_PUBLIC_DEPLOYMENT_ID=${NEXT_PUBLIC_DEPLOYMENT_ID}

RUN apk add --no-cache bash curl

WORKDIR /app

# 从构建阶段复制必要文件
COPY --from=base /app/next.config.mjs ./
COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/dist ./dist
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/static-release.env ./static-release.env

# 多阶段复制后的运行镜像必须同时拥有 Next 哈希资源和 public 资源。
RUN test -d ./.next/static && test -d ./public

# 临时诊断：在 CloudBase 构建日志中确认运行镜像内的 Next 静态目录结构。
RUN echo "=== CHECK NEXT STATIC ===" && \
    ls -la .next && \
    find .next -maxdepth 3 -type d | head -50

# 修复 Windows CRLF 换行符问题
RUN sed -i 's/\r$//' ./scripts/start.sh && chmod +x ./scripts/start.sh

# 端口配置
ENV APP_PORT=5000
ENV PROBE_PORT=3000
ENV NODE_ENV=production
ENV DEPLOY_ENV=PROD

# 健康检查 - 延迟 30 秒给容器充足的启动时间
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f "http://localhost:${PORT:-5000}/health" || exit 1

EXPOSE 3000 5000

# 使用 bash 运行启动脚本
CMD ["bash", "./scripts/start.sh"]
