# 技术设计

## 1. 状态模型

- `review_status`: `pending | approved | rejected`
- `approval_mode`: `complimentary_requested | complimentary | paid`
- `payment_status`: 只表示真实付款，不用于判断免费体验是否开通
- 免费体验是否生效：`review_status=approved && approval_mode=complimentary && lawyers.status=active`
- 已付费后追加体验：保留 `approval_mode=paid` 和原付费申请，使用 `complimentary_*` 字段及独立 `lawyer_complimentary_orders` 记录追加体验；不能把付费订单投影成 0 元订单。

## 2. 接口调整

### 申请接口

`POST /api/lawyer/create`

- 已有待审核申请：返回 HTTP 409 和 `code=APPLICATION_PENDING`。
- 已有有效律师身份/已通过申请：返回 HTTP 409 和 `code=LAWYER_ALREADY_ACTIVE`。
- 拒绝申请仍允许通过 `sourceApplicationId` 创建新 revision。

### 支付上下文

`GET /api/lawyer/payment-context`

- `complimentary_pending`：审核中，不允许付款。
- `complimentary_active`：体验已开通，返回到期时间和续费入口。

### 用户订单

`GET /api/user/orders`

- 返回审核中的免费申请记录。
- 返回零元体验订单。
- 兼容已通过但旧数据缺少零元订单的申请，返回可见的状态记录并记录服务端告警。

### 审核接口

`PUT /api/admin/lawyer/review`

- 免费审核使用幂等 upsert。
- 对已通过且已付款的律师使用 `grant_complimentary` 动作追加体验，不重新审核、不覆盖原付费申请。
- `lawyer_complimentary_orders.application_id` 必须唯一。
- 通知关联信息写入 `notifications.data`，不写不存在的列。
- 任何下游创建失败都返回失败，不发送通过通知；重复重试不得产生重复资格。

## 3. 用户界面

- 入驻表单：收到 `APPLICATION_PENDING` 时跳转申请状态页，不跳支付页。
- 支付页：免费审核中显示“审核中”；免费已通过显示“体验已开通”和“去续费”。
- 用户中心：显示免费申请/免费订单的状态、金额、理由和有效期。
- 律师中心：体验用户可进入工作台，续费入口复用现有续费流程。

## 4. 数据一致性

优先使用数据库唯一约束配合服务端 upsert 实现幂等；如当前环境无法使用单次事务，则将申请最终状态更新放在所有资格/订单写入成功之后，并在失败时返回可重试错误。

## 5. 验证策略

- 契约测试覆盖待审核重复申请、免费申请审核、审核幂等、订单展示和续费分流。
- 运行 TypeScript 检查、定向 ESLint 和生产构建。
- 推送前检查 diff，确保不包含环境变量、密钥和无关改动。
