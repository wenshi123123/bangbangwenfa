# 守护者中心与通知订单弹窗修复方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复守护者中心资料请求超时，以及从“律师已确认接单”通知进入订单详情后弹窗无法关闭的问题，同时消除该弹窗产生的无障碍控制台警告。

**Architecture:** 守护者中心首屏只返回展示状态和统计资料，不再把可能为数 MB 的微信收款二维码原始内容随 profile 一起返回；二维码改为用户打开二维码弹窗时按需获取。用户中心关闭订单详情时同步清除本地目标订单状态和 URL 中的 `orderId`，避免自动打开 effect 立即重新打开弹窗。

**Tech Stack:** Next.js App Router、React、TypeScript、Radix Dialog、Supabase、现有 `apiRequest` 鉴权方式。

## Global Constraints

- 只修改守护者中心和用户通知/订单详情相关代码，不修改支付、订单写入、业务价格或其他页面。
- 不引入新的依赖。
- 保留现有登录鉴权、接口权限和数据结构兼容性。
- 首屏 profile 接口不得返回原始 `wechat_qrcode` 内容。
- 完成 `pnpm build` 后才允许提交和部署。

---

### Task 1: 缩小守护者中心首屏资料接口

**Files:**
- Modify: `src/app/api/guardian/profile/route.ts`
- Test: `pnpm build`

**Interfaces:**
- Consumes: 当前已登录守护者身份和现有 profile 查询。
- Produces: 保持现有 profile 响应字段兼容，但将二维码改为状态字段；首屏响应不包含 `wechat_qrcode` 原始值。

- [ ] **Step 1: 固定首屏返回字段**

将 profile 查询字段限制为昵称、头像、邀请码、统计金额、绑定状态、微信账号展示状态等轻量字段；删除 `wechat_qrcode` 的直接 select 和响应透传。响应增加明确的布尔字段，例如：

```ts
has_wechat_payment_method: Boolean(guardian.wechat_qrcode || guardian.wechat_account),
```

`wechat_account` 只保留非敏感的展示状态或掩码，不把二维码内容放入响应。

- [ ] **Step 2: 保留旧数据兼容逻辑**

没有二维码时返回 `has_wechat_payment_method: false`；已有二维码或账号时返回 `true`。除二维码字段外，现有金额、邀请、提现、审核状态字段名称保持不变。

- [ ] **Step 3: 本地构建验证**

运行：

```bash
pnpm build
```

预期：构建成功，TypeScript 不出现 profile 响应类型错误。

---

### Task 2: 增加守护者二维码按需接口并接入页面

**Files:**
- Create: `src/app/api/guardian/payment-qrcode/route.ts`
- Modify: `src/app/guardian/center/page.tsx`
- Test: 浏览器 Network、`pnpm build`

**Interfaces:**
- Consumes: 已登录用户身份、当前守护者记录。
- Produces: `GET /api/guardian/payment-qrcode`，仅在用户打开二维码弹窗时返回二维码 URL/数据；未登录或无权限返回现有错误格式。

- [ ] **Step 1: 实现受保护的按需读取**

接口必须复用现有认证方法，并按当前用户查询守护者记录。返回格式固定为：

```ts
{ success: true, data: { qrcode: string } }
```

无二维码时返回明确的 404/业务错误，不返回空的成功二维码。

- [ ] **Step 2: 修改守护者中心状态判断**

页面首屏使用 `has_wechat_payment_method` 判断“已绑定/未绑定”，不再依赖 `guardian.wechat_qrcode` 是否存在。

- [ ] **Step 3: 修改二维码弹窗打开流程**

二维码弹窗打开时调用 `/api/guardian/payment-qrcode`，显示加载状态、错误提示和成功二维码；关闭弹窗后清理临时二维码状态。不得在页面初始加载时调用该接口。

- [ ] **Step 4: 验证请求体积和耗时**

在生产验收环境打开守护者中心，确认：

```text
/api/guardian/profile       200，响应不再是 MB 级
/api/guardian/payment-qrcode 仅打开二维码弹窗时出现
```

同时确认守护者统计、邀请、提现等核心资料仍显示，控制台不再出现 profile 超时导致的加载失败。

- [ ] **Step 5: 构建验证**

运行 `pnpm build`，预期成功。

---

### Task 3: 修复通知跳转后的订单详情关闭逻辑

**Files:**
- Modify: `src/app/user/page.tsx`
- Test: 浏览器手动回归、`pnpm build`

**Interfaces:**
- Consumes: 现有 `orderId` URL 参数、订单加载结果、Radix Dialog 的 `onOpenChange`。
- Produces: 一个统一的订单详情关闭处理器，确保按钮、遮罩和 Esc 关闭后不会重新打开。

- [ ] **Step 1: 增加统一关闭处理器**

在 `src/app/user/page.tsx` 中增加如下行为（函数名可按项目命名规范调整，但逻辑必须完整）：

```ts
const closeOrderDetail = () => {
  setShowOrderDetail(null);
  setTargetOrderId(null);

  const url = new URL(window.location.href);
  url.searchParams.delete('orderId');
  router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
};
```

- [ ] **Step 2: 防止自动打开 effect 重开弹窗**

保留从通知进入订单详情的自动打开能力，但关闭时必须先清除 `targetOrderId`。这样 `orders` 或 URL 更新不会再次满足自动打开条件。

- [ ] **Step 3: 统一 Dialog 关闭入口**

将订单详情 Dialog 改为：

```tsx
<Dialog
  open={!!showOrderDetail}
  onOpenChange={(open) => {
    if (!open) closeOrderDetail();
  }}
>
```

手写 X 也调用 `closeOrderDetail`。删除与 `DialogContent` 自带关闭按钮重叠的重复关闭按钮，避免两个按钮叠层造成点击目标不明确。

- [ ] **Step 4: 补充 Dialog 无障碍描述**

在订单详情 `DialogHeader` 中增加：

```tsx
<DialogDescription className="sr-only">
  当前订单的支付状态、金额和时间信息
</DialogDescription>
```

这只修复 `Missing Description or aria-describedby` 警告，不改变页面视觉效果。

- [ ] **Step 5: 浏览器回归验证**

使用通知中心点击“律师已确认接单”：

1. 能跳转到对应订单详情。
2. 点击右上角 X 后弹窗消失。
3. 点击遮罩或按 Esc 后弹窗消失。
4. 地址栏中的 `orderId` 被清除，不会再次自动打开。
5. 控制台不再出现 `Missing Description or aria-describedby`。
6. 订单金额、支付状态和时间仍保持原值。

- [ ] **Step 6: 构建验证**

运行 `pnpm build`，预期成功。

---

### Task 4: 联合验收与发布门槛

**Files:**
- Read-only verification: `src/app/api/guardian/profile/route.ts`, `src/app/api/guardian/payment-qrcode/route.ts`, `src/app/guardian/center/page.tsx`, `src/app/user/page.tsx`

- [ ] **Step 1: 执行构建**

```bash
pnpm build
```

- [ ] **Step 2: 检查守护者中心**

确认首屏不下载二维码大字段、资料能在超时阈值内完成、金额不显示 `NaN`、二维码弹窗仍能正常加载。

- [ ] **Step 3: 检查通知订单弹窗**

确认通知跳转、关闭、刷新、再次打开均符合预期，且没有新的控制台 error/warning。

- [ ] **Step 4: 发布前检查变更范围**

```bash
git diff -- src/app/api/guardian/profile/route.ts src/app/api/guardian/payment-qrcode/route.ts src/app/guardian/center/page.tsx src/app/user/page.tsx
```

只允许出现上述四个目标文件的相关修改；确认无业务价格、支付流程、管理员功能或其他页面变更后，再提交到 `main` 并触发 Zeabur 部署。

## 风险与回滚

- 风险：旧守护者记录中的二维码可能是 base64 或失效 URL。按需接口需要继续支持这两种现有格式；若二维码本身失效，应提示重新绑定，不影响资料页加载。
- 风险：清除 `orderId` 会改变关闭后的地址，但不会删除订单或通知，只是结束当前详情定位。
- 回滚：若验收失败，只回滚本方案涉及的四个文件，不回滚其他用户未相关的工作区改动。

## 验收结论标准

只有同时满足以下条件才视为完成：

- 守护者中心 profile 不再因二维码大字段导致 8 秒超时。
- 守护者中心核心资料、金额、邀请、提现信息正常。
- 通知点击后订单详情可以关闭，且不会自动重新弹出。
- 控制台不再出现订单弹窗无障碍描述警告。
- `pnpm build` 成功。
