# 生产发布与排查 Runbook

> 新任务和新验证流程请优先参考 [`docs/harness-engineering.md`](./harness-engineering.md) 与 [`docs/harness-task-template.md`](./harness-task-template.md)。

## 常用命令

```bash
pnpm ts-check
pnpm build
pnpm test:prod:smoke
```

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
