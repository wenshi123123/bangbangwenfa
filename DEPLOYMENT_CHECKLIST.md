# 🚀 部署清单 (Deployment Checklist)

> 最后更新: 2026-05-20  
> 项目: 帮帮文法 (bangbangwenfa.com)  
> 目标平台: 扣子 (Coze) / 自定义服务器

---

## 部署前检查 (Pre-Deploy)

### 1. 环境变量 ✅/❌

在扣子平台「环境变量」或服务器 `.env.production` 中确认以下变量已配置：

| 分组 | 变量名 | 状态 | 说明 |
|------|--------|------|------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL` | ⬜ | 必填 |
| | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⬜ | 必填，前端用 |
| | `SUPABASE_SERVICE_ROLE_KEY` | ⬜ | 必填，后端用 |
| **JWT** | `JWT_SECRET` | ⬜ | 必填，≥128字符 |
| **微信支付** | `WEIXIN_APPID` | ⬜ | 必填 |
| | `WEIXIN_MCHID` | ⬜ | 必填 |
| | `WEIXIN_SERIAL_NO` | ⬜ | 必填 |
| | `WEIXIN_APIV3_KEY` | ⬜ | 必填 |
| | `WEIXIN_PRIVATE_KEY` | ⬜ | 必填，PEM格式 |
| | `WEIXIN_PLATFORM_CERT` | ⬜ | 必填，PEM格式 |
| | `WEIXIN_CALLBACK_URL` | ⬜ | 必填 |
| **短信** | `TENCENT_SECRET_ID` | ⬜ | 必填 |
| | `TENCENT_SECRET_KEY` | ⬜ | 必填 |
| | `TENCENT_SMS_APP_ID` | ⬜ | 必填 |
| | `TENCENT_SMS_SIGN_NAME` | ⬜ | 必填 |
| | `TENCENT_SMS_TEMPLATE_ID` | ⬜ | 必填 |
| **内部服务** | `INTERNAL_SERVICE_KEY` | ⬜ | 生成新密钥 |
| **站点** | `NEXT_PUBLIC_SITE_URL` | ⬜ | 实际域名 |
| **Sentry** | `NEXT_PUBLIC_SENTRY_DSN` | ⬜ | 强烈推荐 |
| **环境** | `NODE_ENV` | ⬜ | 设为 `production` |
| | `DEPLOY_ENV` | ⬜ | 扣子平台设为 `PROD` |

### 2. 数据库检查

```sql
-- 验证必需的表存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'lawyers', 'orders', 'guardian_users', 'admin_users');

-- 验证 RLS 已启用
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('lawyers', 'guardian_users');
```

### 3. 构建验证

```bash
# 类型检查
pnpm ts-check

# 生产构建
pnpm build

# 预期输出: ✓ Compiled successfully, 132 pages

# 健康检查
curl http://localhost:3000/api/health
# 预期: {"status":"ok","checks":{"jwt":{"status":"ok"},...}}
```

### 4. 安全检查

- [ ] `.env.production` 不在版本控制中
- [ ] JWT_SECRET 长度 ≥ 128 字符
- [ ] 微信支付回调 URL 可公网访问
- [ ] 管理后台有独立密码（非默认）
- [ ] RLS 策略已确认无误

---

## 部署步骤

### 方式 A：扣子平台部署

1. 登录扣子控制台
2. 进入项目设置 → 环境变量 → 填入上述所有变量
3. 确保 `数据库自动迁移` 已禁用（`.cozerc` 中 `autoMigrate: false`）
4. 点击「部署」
5. 等待构建完成 → 访问 `/api/health` 确认

### 方式 B：自定义服务器

```bash
# 1. 安装依赖
pnpm install --frozen-lockfile

# 2. 构建
pnpm build

# 3. 启动
pnpm start
# 或
node dist/server.mjs

# 4. Nginx 反代（推荐）
# 见下方 Nginx 配置
```

### Nginx 反向代理配置

```nginx
server {
    listen 443 ssl http2;
    server_name bangbangwenfa.com;

    ssl_certificate /etc/ssl/bangbangwenfa.crt;
    ssl_certificate_key /etc/ssl/bangbangwenfa.key;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 健康检查
    location /api/health {
        proxy_pass http://127.0.0.1:3000/api/health;
        proxy_set_header Host $host;
    }
}
```

---

## 部署后验证

### 冒烟测试（按顺序执行）

```bash
# 1. 健康检查
curl https://bangbangwenfa.com/api/health
# 预期: {"status":"ok", "checks": {"jwt":"ok", "supabase":"ok", ...}}

# 2. 公共页面
curl -I https://bangbangwenfa.com/
# 预期: HTTP 200
# 检查安全头: X-Frame-Options: DENY, X-Content-Type-Options: nosniff

# 3. API 认证保护
curl https://bangbangwenfa.com/api/user/orders
# 预期: HTTP 401

# 4. 价格查询
curl https://bangbangwenfa.com/api/price
# 预期: HTTP 200, JSON 价格数据

# 5. 微信支付回调可达
curl -X POST https://bangbangwenfa.com/api/pay/callback \
  -H "Content-Type: application/json" \
  -d '{}'
# 预期: HTTP 200 或 400（取决于签名验证）
```

### Sentry 检查

1. 登录 [sentry.io](https://sentry.io) → 选择项目
2. 检查 Issues 页面是否有新的错误事件
3. 检查 Performance 页面是否有追踪数据
4. 手动触发一个测试错误（仅在开发环境）：
   ```javascript
   // 在浏览器控制台
   throw new Error('Deploy smoke test - please ignore');
   ```

---

## 回滚步骤

如果部署后出现严重问题：

### 扣子平台
1. 扣子控制台 → 部署历史 → 选择上一个成功版本 → 回滚

### 自定义服务器
```bash
# 切换回上一个构建目录
cd /opt/bangbangwenfa
ln -sfn releases/previous-version current
pm2 restart bangbangwenfa
```

---

## 监控告警建议

| 告警项 | 条件 | 严重程度 |
|--------|------|----------|
| 健康检查失败 | `/api/health` 返回非 200 | 🔴 严重 |
| 支付回调异常 | Sentry 支付相关错误 > 5 次/小时 | 🔴 严重 |
| API 错误率 | 5xx 错误 > 1% | 🟡 警告 |
| JWT 签名失败 | 加密错误 > 10 次/小时 | 🟡 警告 |
| CPU > 80% | 持续 5 分钟 | 🟡 警告 |
| 内存 > 80% | 持续 5 分钟 | 🟡 警告 |

---

## 联系人

| 角色 | 职责 |
|------|------|
| 后端 | API 服务 + 数据库 |
| 前端 | 页面渲染 + 用户体验 |
| 运维 | 服务器 + 域名 + SSL |
| 微信支付 | 支付回调 + 证书管理 |
