# 律师入驻驳回后重新申请流程技术设计

## 1. 设计原则

- 旧申请只读保留，新申请独立建档。
- 所有状态和金额由服务端决定，前端只提交资料和用户意图。
- 重新申请必须绑定当前登录用户，并通过服务端校验来源申请归属。
- 先修正申请创建接口，再调整前端预填和跳转，最后做数据库与线上验收。

## 2. 流程

```text
拒绝页
  -> 重新申请入驻?sourceApplicationId=8
  -> 服务端校验用户归属并返回可复用资料
  -> 向导预填，显示拒绝原因
  -> 提交
  -> 检查是否已有 pending 申请
  -> 创建新申请（source=8, revision=2）
  -> 返回 newApplicationId=12
  -> 跳转 /lawyer/pay?applicationId=12
```

若已有待审核申请，则不创建第二条，直接返回该待审核申请 ID，并提示用户继续查看；若来源申请不是 rejected，接口返回明确错误。

## 3. 后端模块

### 3.1 申请查询/预填接口

新增或扩展申请详情接口，支持 `sourceApplicationId`：

- 只允许当前用户读取自己的申请；
- 仅允许从 `rejected` 申请发起重新申请；
- 返回可复用的基本资料、材料 URL、套餐信息和审核意见；
- 不返回内部审核权限信息、支付订单敏感字段。

### 3.2 创建申请接口

修改 `/api/lawyer/create`：

- 重复检查只拦截 `review_status=pending` 或明确的进行中状态；
- `rejected` 不再直接返回旧记录；
- 接收可选 `sourceApplicationId`，服务端校验来源记录；
- 计算 `revision_no`，写入 `resubmitted_from_id`；
- 服务端重新读取套餐价格并计算金额；
- 创建成功返回新申请 ID和状态；
- 建议增加幂等键（用户 ID + 客户端请求键），防止重复点击生成重复记录。

### 3.3 支付上下文接口

- rejected 申请继续返回 `application_rejected`；
- pending 新申请返回可付款/待审核上下文；
- 非当前用户申请统一返回无权访问，不泄露状态。

## 4. 数据模型

在 `lawyer_applications` 增加：

```sql
resubmitted_from_id INTEGER NULL REFERENCES lawyer_applications(id),
revision_no INTEGER NOT NULL DEFAULT 1
```

建议索引：

```sql
CREATE INDEX lawyer_applications_user_status_idx
  ON lawyer_applications(user_id, review_status, created_at DESC);
CREATE INDEX lawyer_applications_resubmitted_from_idx
  ON lawyer_applications(resubmitted_from_id);
```

历史数据统一视为 `revision_no=1`，不改变历史状态、金额或审核意见。

## 5. 前端模块

### 5.1 拒绝页

- 保留拒绝原因；
- “重新申请入驻”链接携带来源申请 ID；
- 明确说明：重新提交后会生成新的申请编号。

### 5.2 入驻向导

- 首次进入时读取来源申请资料；
- 资料加载失败时允许手动新建，不覆盖旧申请；
- 上传步骤保留原材料预览，并支持替换；
- 提交成功后只能使用接口返回的新 ID跳转，禁止复用 URL 中旧 ID。

### 5.3 状态页/支付页

- 同时显示旧申请（已拒绝）和新申请（待审核/待付款）；
- 对旧申请提供“重新申请”而不是“付款”；
- 对新申请提供下一步操作。

## 6. 安全与一致性

- 以服务端登录身份为准，不信任客户端 userId、金额、review_status；
- 使用数据库事务或等价的唯一性/幂等机制，避免并发重复申请；
- 管理员审核只能作用于指定新申请 ID；
- 旧申请及订单不更新、不删除。

## 7. 测试策略

1. 单元测试：状态判定、来源归属、修订编号、价格计算。
2. API 测试：首次申请、拒绝后重申、已有 pending、已通过、越权访问、重复请求。
3. 页面测试：拒绝页点击、资料预填、提交后的新 ID跳转、旧 ID不可付款。
4. 回归测试：免费体验、正常付费、管理员审核、支付回调。
5. 生产验收：使用一个拒绝账号完成一次重申，核对数据库新旧两条记录及页面 URL。

## 8. 风险与回滚

- 数据迁移只新增可空/有默认值字段，可回滚代码而不删除历史数据；
- 若新流程异常，可临时关闭“预填重申”入口，保留普通新申请入口；
- 不对旧 rejected 记录做批量状态修改，避免账务影响。
