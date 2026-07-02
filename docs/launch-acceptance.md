# 帮帮问法上线验收记录

> 新任务请优先参考 [`docs/harness-engineering.md`](./harness-engineering.md) 和 [`docs/harness-task-template.md`](./harness-task-template.md)。

生产配置逐项核对请参考 [`docs/env-production-checklist.md`](./env-production-checklist.md) 和 [`docs/env-production-fill-guide.md`](./env-production-fill-guide.md)。

## 当前生产版本

| 项目 | 记录 |
| --- | --- |
| 生产域名 | https://bangbangwenfa.com |
| 腾讯云环境 | bangbangwenfa-d4g7q7yei6a3b2970 |
| 云托管服务 | bangbangwenfa |
| 当前成功版本 | bangbangwenfa-093 |
| BuildId | 2601155391 |
| 最近上线 commit | 66e38c2 |
| 上线状态 | 已成功部署，100% 流量 |

## 已完成验收

| 阶段 | 状态 | 结果 |
| --- | --- | --- |
| Docker 构建 | 已通过 | pnpm lockfile、Next.js build、server bundle、镜像推送均通过 |
| 云托管部署 | 已通过 | DeployId 093 状态 normal，100% 流量 |
| 首页 | 已通过 | `GET /` 返回 200，真实 Next.js HTML |
| 公开页面 | 已通过 | `/consult`、`/civil`、`/lawyer/join`、`/lawyer/login`、`/admin/login` 返回 200 |
| 健康检查 | 已通过 | `/api/health` 返回 200，JWT、Supabase、微信支付、短信、加密均为 ok |
| 公共页 E2E | 已通过 | `e2e/pages/public.spec.ts` 16 passed |

## 本地最新验证（2026-07-02）

| 阶段 | 状态 | 结果 |
| --- | --- | --- |
| Next 运行时修复 | 已通过 | 恢复 `node_modules/.bin/next`、`next/dist/compiled/next-server/app-route.runtime.prod.js`，本地服务可重新启动 |
| 咨询主链路手工验证 | 已通过 | `POST /api/consult/create`、`GET /api/consult/order`、`POST /api/consult/pay` 均返回 200 |
| 咨询主链路 E2E | 已通过 | `e2e/consult/flow.spec.ts` 2 passed |
| 支付回归 | 已通过 | `e2e/payment/pay.spec.ts` 76 passed |
| 律师/后台回归 | 已通过 | `e2e/lawyer/admin-smoke.spec.ts` 82 passed |

## 本轮修复记录

| 问题 | 原因 | 处理 |
| --- | --- | --- |
| Docker 构建找不到 `pnpm-lock.yaml` | `.dockerignore` 的 `*.yaml` 排除了 lockfile | 添加 `!pnpm-lock.yaml` |
| Docker 构建 `pnpm add -wP typescript` 失败 | 项目不是 pnpm workspace | 改为 `pnpm add -P typescript` |
| 线上只返回 `OK` | 云托管端口/健康检查配置与应用端口不一致 | 统一主服务和健康探针端口逻辑 |
| 支付调试接口风险 | `/api/pay/debug-env` 可创建诊断订单并暴露配置片段 | 默认关闭，必须带 `PAY_DEBUG_TOKEN` 才可访问 |
| 数据库诊断接口风险 | `/api/diagnose` 无鉴权暴露表级诊断信息 | 默认关闭，必须带 `DIAGNOSTIC_API_TOKEN` 才可访问 |

## 生产只读测试命令

```bash
pnpm check:prod-env
bash scripts/pre-deploy-check.sh
pnpm test:prod:smoke
```

该命令只跑公开页面、站点地图、安全头和未登录保护，不触发短信、支付、限流或写库操作。

## 真实业务验收清单

| 链路 | 状态 | 待记录 |
| --- | --- | --- |
| 用户注册/登录 | 待执行 | 测试手机号、登录方式、结果 |
| 用户中心访问 | 待执行 | `/user`、订单入口、消息入口 |
| 律师登录/入驻 | 待执行 | 测试手机号、律师资料页、订单页 |
| 管理后台登录 | 待执行 | 后台测试账号、核心列表页 |
| 微信小额支付 | 待执行 | 订单号、金额、支付状态、回调状态 |

## 当前上线判断

- 代码与本地运行环境：基本达到可部署状态。
- 自动化回归：咨询、支付、律师/后台核心链路均已通过。
- 尚未被当前证据证明的事项：真实生产环境变量、真实域名回调、真实测试账号、微信真实扣款与回跳记录。
- 在这些真实生产项完成前，仍不应把“本地已跑通”视为“正式已上线可用”。

## 上线前最后一轮必核项

1. 准备真实 `.env.production`，至少确认以下变量已配置且指向正式域名：
   `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`JWT_SECRET`、`WEIXIN_APPID`、`WEIXIN_MCHID`、`WEIXIN_SERIAL_NO`、`WEIXIN_APIV3_KEY`、`WEIXIN_PRIVATE_KEY`、`WEIXIN_PLATFORM_CERT`、`WEIXIN_CALLBACK_URL`、`NEXT_PUBLIC_SITE_URL`、`INTERNAL_SERVICE_KEY`。
2. 确认微信相关平台配置与代码一致：
   公众号 OAuth 域名、商户平台支付回调、支付目录、正式站点域名。
3. 线上 `/api/health` 必须满足：
   `jwt`、`supabase`、`encryption` 不能为 `error`；支付如果要正式开放，`wechat_pay` 不能是 `warning`。
4. 至少完成一轮真实业务记录并回填本文件：
   用户登录、用户中心、律师登录/入驻、后台登录、微信小额支付。
5. 执行发布后只读回归：
   `pnpm test:prod:smoke`。

## 每次发布检查清单

1. 本地执行 `pnpm ts-check`。
2. 本地执行 `pnpm check:prod-env`。
3. 本地执行 `bash scripts/pre-deploy-check.sh`。
4. 本地执行 `pnpm build`。
5. 确认 `git status` 不包含 `.next/`、`dist/`、`node_modules/`、`.pnpm-store/`、`deploy-package.zip`、`tsconfig.tsbuildinfo`、`test-results/` 等缓存产物。
6. 推送到 `main` 后确认 GitHub webhook 投递成功。
7. 在腾讯云确认新 DeployId 状态为 `normal` 且新版本 100% 流量。
8. 线上访问 `/api/health`，核心项不能为 error。
9. 执行 `pnpm test:prod:smoke`。
10. 如果涉及支付、登录、订单、后台权限，额外做真实业务验收并记录结果。

## 后续待补充

- 开通或确认腾讯云 CLS 日志，确保能查询 CloudRun 运行时错误。
- 建议轮换已在云托管配置和诊断过程中暴露过的生产密钥。
- 增加 GitHub Actions：`ts-check`、`build`、生产只读 smoke 的手动触发任务。
