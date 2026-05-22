# 帮帮问法 - 扣子平台部署指南

本文档详细说明如何将本项目部署到扣子平台，并正确配置环境变量。

## 📋 部署前准备

### 1. 确认文件已就绪
确保以下文件已准备好（**不要提交到代码仓库**）：
- ✅ `.env.production` - 生产环境变量（从 `.env.production.example` 复制并填入真实值）
- ✅ 微信支付私钥文件（内容将配置为环境变量，无需单独文件）
- ✅ 微信支付平台证书（内容将配置为环境变量，无需单独文件）

### 2. 检查 `.gitignore`
确认以下文件已被忽略：
```
.env.production
*.pem
*.p12
*.key
assets/*.pem
assets/*.p12
```

---

## 🚀 部署步骤

### 步骤 1：生成部署包

在项目根目录运行：
```bash
pnpm deploy:package
```

这会生成 `deploy-package.zip` 文件（包含所有源代码，但**不包含** `.env.production`）。

### 步骤 2：上传到扣子平台

1. 登录扣子平台
2. 创建新应用或选择已有应用
3. 上传 `deploy-package.zip`
4. 等待代码上传完成

### 步骤 3：配置环境变量（**关键步骤**）

在扣子平台的应用设置中，找到**环境变量配置**页面，添加以下变量：

---

## 🔧 环境变量配置说明

### 1. Supabase 配置（**必需**）

| 变量名 | 说明 | 示例值 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxxxxxxxxxxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公开密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 管理员密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

> ⚠️ **注意**：`SERVICE_ROLE_KEY` 是敏感信息，不要在客户端代码中暴露！

---

### 2. JWT 密钥（**必需**）

| 变量名 | 说明 | 示例值 |
|--------|------|----------|
| `JWT_SECRET` | JWT 签名密钥（128 字符高熵随机密钥） | 使用下方命令生成 |

> 🔐 **安全提示**：使用高熵随机密钥（128 字符），推荐生成方式：
> ```bash
> # 方式一：Node.js（推荐）
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> 
> # 方式二：OpenSSL
> openssl rand -hex 64
> ```
> openssl rand -base64 32
> ```

---

### 3. 微信支付配置（**必需**）

#### 3.1 基本配置

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `WEIXIN_APPID` | 微信公众号/小程序 AppID | 微信商户平台 |
| `WEIXIN_MCHID` | 微信商户号 | 微信商户平台 |
| `WEIXIN_SERIAL_NO` | 商户 API 证书序列号 | 微信商户平台 → 账户中心 → API安全 |
| `WEIXIN_APIV3_KEY` | 商户 APIv3 密钥 | 微信商户平台 → 账户中心 → API安全 |

#### 3.2 私钥配置（**重要**）

**变量名：** `WEIXIN_PRIVATE_KEY`

**值格式：** 完整的 PEM 格式私钥（包含换行符）

**正确格式示例：**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoGBAL...
（中间内容保持不变，包含所有换行）
...
-----END PRIVATE KEY-----
```

**在扣子平台配置时：**
1. 打开你的私钥文件 `apiclient_key.pem`
2. 复制**所有内容**（包含 `-----BEGIN-----` 和 `-----END-----`）
3. 粘贴到扣子平台的环境变量值输入框中
4. **不要手动添加 `\n`**，直接粘贴原始格式即可

> ⚠️ **常见错误**：
> - ❌ 错误：`-----BEGIN PRIVATE KEY-----\nMIIEvQ...`
> - ✅ 正确：直接粘贴原始 PEM 格式（包含换行）

#### 3.3 平台证书配置

**变量名：** `WEIXIN_PLATFORM_CERT`

**值格式：** 完整的 PEM 格式证书（包含换行符）

**正确格式示例：**
```
-----BEGIN CERTIFICATE-----
MIIDXxCCAocCgAwIBAgIJAL/8Cgk ...
（中间内容保持不变，包含所有换行）
...
-----END CERTIFICATE-----
```

**配置方式同上**，直接粘贴完整证书内容。

#### 3.4 回调 URL 配置

**变量名：** `WEIXIN_CALLBACK_URL`

**值格式：** 完整的 HTTPS URL

**示例值：**
```
https://your-domain.com/api/pay/callback
```

> 🌐 **注意**：部署到扣子平台后，将 `your-domain.com` 替换为你的真实域名。

---

### 4. 腾讯云短信配置（可选）

如果你需要短信验证码功能，配置以下变量：

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `TENCENT_SECRET_ID` | 腾讯云 SecretId | 腾讯云控制台 |
| `TENCENT_SECRET_KEY` | 腾讯云 SecretKey | 腾讯云控制台 |
| `TENCENT_SMS_APP_ID` | 短信应用 ID | 腾讯云 SMS 控制台 |
| `TENCENT_SMS_SIGN_NAME` | 短信签名名称 | 腾讯云 SMS 控制台 |
| `TENCENT_SMS_TEMPLATE_ID` | 短信模板 ID | 腾讯云 SMS 控制台 |
| `TENCENT_SMS_ORDER_TEMPLATE_ID` | 订单通知模板 ID | 腾讯云 SMS 控制台 |

---

### 5. 环境标识

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 标识生产环境 |

---

## 🔧 在扣子平台配置环境变量的详细步骤

### 步骤 1：进入应用设置

1. 在扣子平台首页，点击你的应用
2. 点击 **"设置"** 标签
3. 找到 **"环境变量"** 部分

### 步骤 2：添加环境变量

对于**每一个**环境变量：

1. 点击 **"添加变量"** 按钮
2. 输入 **变量名**（如 `NEXT_PUBLIC_SUPABASE_URL`）
3. 输入 **变量值**（如 `https://xxxxxxxxxxxxx.supabase.co`）
4. **不要**在变量值中使用引号（除非值本身需要引号）
5. 点击 **"确定"** 保存

### 步骤 3：特殊处理 - 多行值（私钥和证书）

对于 `WEIXIN_PRIVATE_KEY` 和 `WEIXIN_PLATFORM_CERT`：

**方法 1：直接粘贴（推荐）**
1. 用文本编辑器（如 VSCode）打开私钥文件
2. 复制全部内容（`Ctrl+A` → `Ctrl+C`）
3. 在扣子平台的环境变量值输入框中粘贴（`Ctrl+V`）
4. 系统会自动保留换行符

**方法 2：使用 Base64（如果方法 1 失败）**
1. 将私钥文件内容进行 Base64 编码
2. 在代码中添加解码逻辑
3. 但**不推荐**此方法，增加复杂性

---

## 🚨 常见问题排查

### 问题 1：部署后页面白屏

**排查步骤：**
1. 检查环境变量是否全部配置完成
2. 查看扣子平台的**应用日志**
3. 确认 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否正确

---

### 问题 2：微信支付报错 "签名验证失败"

**原因：** 私钥配置错误

**解决方法：**
1. 确认 `WEIXIN_PRIVATE_KEY` 的值是完整的 PEM 格式
2. 确认值包含 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----`
3. 确认没有多余的空格或换行
4. 重新上传并重启应用

---

### 问题 3：API 接口 401 未授权

**原因：** `JWT_SECRET` 不一致或缺失

**解决方法：**
1. 确认 `JWT_SECRET` 已配置
2. 确认 `JWT_SECRET` 长度至少 128 字符
3. 如果重新生成了 `JWT_SECRET`，用户需要重新登录

---

### 问题 4：短信验证码发送失败

**原因：** 腾讯云短信配置错误

**解决方法：**
1. 确认所有 `TENCENT_*` 变量已正确配置
2. 确认短信签名和模板已通过腾讯云审核
3. 查看扣子平台日志，确认具体错误信息

---

## 📦 部署包内容说明

生成的 `deploy-package.zip` 包含：

✅ **包含的文件：**
- 所有 `.ts`, `.tsx`, `.js`, `.jsx` 源代码
- `package.json` 和 `pnpm-lock.yaml`
- `next.config.ts` 等配置文件
- `public/` 目录下的静态资源

❌ **不包含的文件（安全考虑）：**
- `.env.production` - 环境变量配置文件
- `node_modules/` - 依赖包（平台会自动安装）
- `.git/` - Git 版本控制文件
- `*.pem`, `*.p12`, `*.key` - 私钥文件

---

## 🔐 安全注意事项

1. **不要将 `.env.production` 提交到代码仓库**
   - 已添加到 `.gitignore`
   - 如使用其他代码托管平台，请确认忽略规则

2. **不要在客户端代码中暴露敏感信息**
   - `NEXT_PUBLIC_*` 前缀的变量会被暴露到客户端
   - 只有 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 应该暴露
   - `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `WEIXIN_*` 等**绝不**应该暴露

3. **定期轮换密钥**
   - 微信支付 APIv3 密钥
   - JWT 签名密钥
   - Supabase 服务角色密钥

---

## 📞 技术支持

如果在部署过程中遇到问题，请提供以下信息：

1. 扣子平台应用 ID
2. 具体的错误日志（从扣子平台下载）
3. 环境变量配置截图（**注意：遮掩敏感信息**）
4. 部署步骤描述

---

## 📝 部署检查清单

在点击 "部署" 按钮前，确认：

- [ ] `.env.production.example` 中的所有变量都已在扣子平台配置
- [ ] `WEIXIN_PRIVATE_KEY` 和 `WEIXIN_PLATFORM_CERT` 格式正确
- [ ] `JWT_SECRET` 为高熵随机密钥（128 字符）
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正确
- [ ] `WEIXIN_CALLBACK_URL` 使用正确的域名
- [ ] （可选）腾讯云短信配置已完成
- [ ] 已测试本地生产构建：`pnpm build`

---

## 🎉 部署成功标志

部署成功后：

1. 访问你的扣子应用域名
2. 首页正常显示
3. 可以正常注册和登录
4. 守护者中心功能正常
5. （如配置了微信支付）支付流程正常

---

**祝部署顺利！** 🚀
