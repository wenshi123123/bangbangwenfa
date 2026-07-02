# `.env.production` 填写来源指南

## 目的

这份文档用于回答一个直接的问题：

“生产环境变量，分别应该去哪里拿？”

建议配合以下文件一起使用：

- [.env.production.example](/Users/Admin/Documents/帮帮问法网站/.env.production.example)
- [docs/env-production-checklist.md](./env-production-checklist.md)
- [docs/launch-acceptance.md](./launch-acceptance.md)

## 1. Supabase

### `NEXT_PUBLIC_SUPABASE_URL`

- 获取位置：
  Supabase 控制台 → `Settings` → `API` → `Project URL`
- 备注：
  必须使用正式项目地址

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- 获取位置：
  Supabase 控制台 → `Settings` → `API` → `Project API keys` → `anon public`
- 备注：
  必须与正式项目匹配

### `SUPABASE_SERVICE_ROLE_KEY`

- 获取位置：
  Supabase 控制台 → `Settings` → `API` → `Project API keys` → `service_role`
- 备注：
  仅服务端使用，不能暴露给前端

## 2. 站点与内部密钥

### `JWT_SECRET`

- 获取方式：
  不能从第三方平台复制，需自行生成
- 推荐命令：
  `openssl rand -hex 64`
  或
  `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- 备注：
  生产值必须与测试环境区分

### `INTERNAL_SERVICE_KEY`

- 获取方式：
  自行生成
- 推荐命令：
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- 备注：
  仅后端内部接口使用

### `NEXT_PUBLIC_SITE_URL`

- 获取位置：
  正式站点域名配置
- 示例：
  `https://bangbangwenfa.com`
- 备注：
  必须是正式 HTTPS 域名

## 3. 微信支付商户平台

### `WEIXIN_APPID`

- 获取位置：
  微信支付商户平台或关联应用信息页
- 备注：
  必须与实际支付主体一致

### `WEIXIN_MCHID`

- 获取位置：
  微信支付商户平台首页

### `WEIXIN_SERIAL_NO`

- 获取位置：
  微信支付商户平台 → API 安全 → 商户证书
- 备注：
  必须与当前私钥配套

### `WEIXIN_APIV3_KEY`

- 获取位置：
  微信支付商户平台 → API 安全 → APIv3 密钥

### `WEIXIN_PRIVATE_KEY`

- 获取位置：
  商户 API 证书生成时下载的私钥 PEM 文件
- 填写方式：
  将 PEM 内容写成单行环境变量，把换行替换成 `\n`

### `WEIXIN_PLATFORM_CERT`

- 获取位置：
  微信支付平台证书下载结果
- 填写方式：
  同样转换为单行环境变量，换行替换成 `\n`

### `WEIXIN_CALLBACK_URL`

- 获取方式：
  由正式域名拼出
- 示例：
  `https://bangbangwenfa.com/api/pay/callback`
- 备注：
  必须与商户平台配置保持一致

## 4. 微信公众号

### `WEIXIN_OA_APPID`
### `WEIXIN_OA_APPSECRET`

- 获取位置：
  微信公众平台 → 设置与开发 → 基本配置
- 什么时候需要：
  微信内支付、公众号 OAuth、模板消息

### `WEIXIN_OA_TEMPLATE_ID`

- 获取位置：
  微信公众平台 → 模板消息配置
- 什么时候需要：
  需要发送公众号模板消息时

## 5. 腾讯云短信

### `TENCENT_SECRET_ID`
### `TENCENT_SECRET_KEY`

- 获取位置：
  腾讯云控制台 → CAM → API 密钥管理

### `TENCENT_SMS_APP_ID`

- 获取位置：
  腾讯云短信控制台 → 应用管理

### `TENCENT_SMS_SIGN_NAME`

- 获取位置：
  腾讯云短信控制台 → 签名管理

### `TENCENT_SMS_TEMPLATE_ID`

- 获取位置：
  腾讯云短信控制台 → 模板管理
- 备注：
  通常用于验证码模板

### `TENCENT_SMS_ORDER_TEMPLATE_ID`

- 获取位置：
  腾讯云短信控制台 → 模板管理
- 备注：
  如果启用订单通知，建议独立模板

## 6. Sentry

### `NEXT_PUBLIC_SENTRY_DSN`

- 获取位置：
  Sentry 项目 → `Settings` → `Client Keys (DSN)`
- 备注：
  强烈建议生产开启

## 7. 调试项

### `PAY_DEBUG_TOKEN`
### `DIAGNOSTIC_API_TOKEN`

- 获取方式：
  临时生成随机字符串即可
- 生产建议：
  默认不配，用于临时诊断时再开启

### `ENABLE_DEV_SMS_FALLBACK`
### `FORCE_SMS_MOCK`

- 获取方式：
  不需要
- 生产建议：
  保持关闭

## 8. 推荐填写顺序

1. 先填 Supabase、站点域名、`JWT_SECRET`、`INTERNAL_SERVICE_KEY`
2. 再填微信支付商户平台相关配置
3. 如需微信内链路，再补公众号配置
4. 如需真实短信，再补腾讯云短信
5. 如需线上监控，再补 Sentry
6. 填完后执行：
   `pnpm check:prod-env`
7. 再执行：
   `bash scripts/pre-deploy-check.sh`
