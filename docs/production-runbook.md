# 生产发布与排查 Runbook

> 新任务和新验证流程请优先参考 [`docs/harness-engineering.md`](./harness-engineering.md) 与 [`docs/harness-task-template.md`](./harness-task-template.md)。

生产环境变量请同时参考 [`docs/env-production-checklist.md`](./env-production-checklist.md) 和 [`docs/env-production-fill-guide.md`](./env-production-fill-guide.md)。

## 常用命令

```bash
pnpm check:prod-env
bash scripts/pre-deploy-check.sh
pnpm ts-check
pnpm build
pnpm test:prod:smoke
```

## 上线前最低门槛

1. 本地构建通过：`pnpm ts-check`、`pnpm build`。
2. 本地核心回归通过：
   `e2e/consult/flow.spec.ts`、`e2e/payment/pay.spec.ts`、`e2e/lawyer/admin-smoke.spec.ts`。
3. `.cozerc` 中自动迁移保持关闭。
4. 正式环境已配置真实 `.env.production` 对应变量，而不是依赖本地 mock。
5. 线上 `/api/health` 无核心 error。
6. 至少完成一次真实支付与一次真实后台登录验收。

## 腾讯云云托管排查顺序

1. 确认 GitHub `main` 最新 commit 已推送。
2. 查看 GitHub webhook 最近一次投递是否为 200。
3. 查看 CloudRun 服务 `bangbangwenfa` 是否生成新 DeployId。
4. 如果状态是 `build_failed`，先查部署日志，优先处理 Dockerfile、lockfile、构建命令错误。
5. 如果状态是 `normal` 但页面异常，检查 `/api/health`、默认云托管域名和正式域名是否一致。
6. 如果页面 200 但业务异常，进入真实业务链路验证：登录、订单、支付、后台。

## 生产接口安全原则

- `/api/health` 可以公开，但只返回配置状态，不返回密钥值。
- `/api/pay/debug-env` 默认关闭，只允许配置 `PAY_DEBUG_TOKEN` 后临时访问。
- `/api/diagnose` 默认关闭，只允许配置 `DIAGNOSTIC_API_TOKEN` 后临时访问。
- 临时诊断 token 使用后应立即删除或轮换。

## 真实业务验收记录模板

| 日期 | 验收人 | 链路 | 测试账号/订单号 | 结果 | 备注 |
| --- | --- | --- | --- | --- | --- |
|  |  | 用户登录 |  |  |  |
|  |  | 律师入口 |  |  |  |
|  |  | 后台入口 |  |  |  |
|  |  | 微信支付 |  |  |  |

## 建议执行顺序

1. 部署前：
   先执行 `pnpm check:prod-env`，再运行 `scripts/pre-deploy-check.sh`，然后执行 `pnpm ts-check` 与 `pnpm build`。
2. 部署完成后：
   先检查 CloudRun 状态、域名访问、`/api/health`。
3. 只读验证：
   执行 `pnpm test:prod:smoke`。
4. 写操作验证：
   依次验证用户登录、咨询下单、微信支付、律师入口、后台入口。
5. 验收留痕：
   把真实测试账号、订单号、支付结果回填到 `docs/launch-acceptance.md`。
