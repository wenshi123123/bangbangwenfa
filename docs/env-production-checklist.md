# 生产环境变量核对表

## 使用方式

1. 以 [.env.production.example](/Users/Admin/Documents/帮帮问法网站/.env.production.example) 为模板准备真实 `.env.production`。
2. 按本清单逐项确认变量是否存在、值是否来自正式环境、域名是否与线上一致。
3. 完成后再执行构建、部署和真实业务验收。

填写来源请同时参考 [docs/env-production-fill-guide.md](./env-production-fill-guide.md)。

## A. 必填变量

| 变量名 | 用途 | 验收要求 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 公网地址 | 必须指向正式项目，不可为测试库 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名访问 Key | 必须与正式项目匹配 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端管理 Key | 必须存在，且仅服务端可见 |
| `JWT_SECRET` | 用户/律师/后台 JWT 签名密钥 | 必须为高熵随机值，建议 128 字符以上 |
| `WEIXIN_APPID` | 微信支付 AppID | 必须与正式商户/公众号体系一致 |
| `WEIXIN_MCHID` | 微信商户号 | 必须为正式商户号 |
| `WEIXIN_SERIAL_NO` | 微信商户证书序列号 | 必须与当前启用证书一致 |
| `WEIXIN_APIV3_KEY` | 微信支付 APIv3 Key | 必须与商户平台配置一致 |
| `WEIXIN_PRIVATE_KEY` | 微信支付私钥 | 必须为完整 PEM 内容，允许 `\n` 转义 |
| `WEIXIN_PLATFORM_CERT` | 微信支付平台证书 | 必须为完整 PEM 内容，允许 `\n` 转义 |
| `WEIXIN_CALLBACK_URL` | 用户支付回调地址 | 必须为正式域名下的 `/api/pay/callback` |
| `NEXT_PUBLIC_SITE_URL` | 站点公开域名 | 必须为正式 HTTPS 域名，不能和回调域名冲突 |
| `INTERNAL_SERVICE_KEY` | 内部接口鉴权 | 必须存在，且不能与测试环境复用 |
| `NODE_ENV` | 运行模式 | 生产必须为 `production` |
| `DEPLOY_ENV` | 部署环境标记 | 生产必须为 `PROD` |

## B. 强烈建议配置

| 变量名 | 用途 | 建议 |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | 错误监控 | 建议生产开启，便于排查运行时异常 |
| `TENCENT_SECRET_ID` | 腾讯云短信 | 如果要正式发送验证码，必须配置 |
| `TENCENT_SECRET_KEY` | 腾讯云短信 | 如果要正式发送验证码，必须配置 |
| `TENCENT_SMS_APP_ID` | 腾讯云短信应用 | 与正式短信账户一致 |
| `TENCENT_SMS_SIGN_NAME` | 腾讯云短信签名 | 与已审核签名一致 |
| `TENCENT_SMS_TEMPLATE_ID` | 腾讯云短信模板 | 与已审核验证码模板一致 |
| `TENCENT_SMS_ORDER_TEMPLATE_ID` | 订单通知短信模板 | 如要发订单通知，建议单独配置 |

## C. 按业务场景决定是否配置

| 变量名 | 用途 | 什么时候需要 |
| --- | --- | --- |
| `WEIXIN_OA_APPID` | 公众号 OAuth / 模板消息 | 微信内支付、公众号登录、模板消息需要 |
| `WEIXIN_OA_APPSECRET` | 公众号 OAuth / 模板消息 | 与 `WEIXIN_OA_APPID` 配套 |
| `WEIXIN_OA_TEMPLATE_ID` | 模板消息通知 | 需要公众号模板消息时配置 |
| `VOLCENGINE_ACCESS_KEY` | 火山引擎短信备用通道 | 需要备用短信通道时配置 |
| `VOLCENGINE_SECRET_KEY` | 火山引擎短信备用通道 | 同上 |
| `VOLCENGINE_SMS_ACCOUNT_ID` | 火山引擎短信账户 | 同上 |
| `VOLCENGINE_SMS_TEMPLATE_ID` | 火山引擎短信模板 | 同上 |
| `VOLCENGINE_SMS_SIGN` | 火山引擎短信签名 | 同上 |
| `ORDER_WEBHOOK_URL` | 企业微信/群机器人通知 | 需要新订单群通知时配置 |

## D. 生产默认不要开启

| 变量名 | 风险 | 生产建议 |
| --- | --- | --- |
| `PAY_DEBUG_TOKEN` | 可访问支付调试接口 | 默认留空，仅临时排查时开启 |
| `DIAGNOSTIC_API_TOKEN` | 可访问诊断接口 | 默认留空，仅临时排查时开启 |
| `ENABLE_DEV_SMS_FALLBACK` | 开发短信回退 | 生产不要开启 |
| `FORCE_SMS_MOCK` | 强制短信 mock | 生产不要开启 |

## E. 兼容/别名说明

- 当前代码优先使用 `WEIXIN_*` 变量名，支付相关请优先按这个前缀配置。
- `COZE_*` 前缀会在构建和启动脚本中自动映射为原变量名，适合托管平台环境注入。
- `WECHAT_PAY_*` 形式在仓库中仍有兼容痕迹，但不建议作为主配置来源，避免混淆。

## F. 上线前逐项核对

1. `NEXT_PUBLIC_SITE_URL` 与 `WEIXIN_CALLBACK_URL` 是否都为正式 HTTPS 域名。
2. 微信商户平台回调地址是否与 `WEIXIN_CALLBACK_URL` 完全一致。
3. 公众号 OAuth 域名、JS 接口安全域名、支付目录是否都已配置到正式域名。
4. `JWT_SECRET`、`INTERNAL_SERVICE_KEY` 是否为新生成高熵值，而不是测试值。
5. `/api/health` 中 `jwt`、`supabase`、`encryption` 是否为 `ok`。
6. 如果要开放真实支付，`wechat_pay` 不能为 `warning`。
7. 如果要开放真实短信登录，`sms` 不能为 `warning`。

## G. 完成标记

上线前至少应满足：

- A 组全部完成
- B 组中与当前业务启用范围相关的项完成
- D 组默认关闭
- 已在 [docs/launch-acceptance.md](/Users/Admin/Documents/帮帮问法网站/docs/launch-acceptance.md) 回填真实验收记录
