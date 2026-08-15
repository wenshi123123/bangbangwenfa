# 律师入驻与免费体验上线迁移

## 执行位置

Supabase Dashboard → 对应项目 → SQL Editor → New query。

## 执行内容

请直接打开并完整执行项目文件：

`supabase/migrations/20260805090000_lawyer_payment_closure.sql`

该迁移使用 `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`，设计为可重复执行，不会删除历史申请、订单或会员记录。

## 执行后核验

在同一个 SQL Editor 执行：

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'lawyer_applications'
  and column_name in ('approval_mode', 'complimentary_reason', 'complimentary_code_verified_at', 'complimentary_expires_at')
order by column_name;

select to_regclass('public.lawyer_complimentary_orders') as complimentary_orders_table;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'membership_records'
  and column_name in ('source_type', 'source_order_no', 'is_complimentary', 'remark')
order by column_name;
```

预期结果：

- 第一段返回 4 个字段；
- 第二段返回 `lawyer_complimentary_orders`；
- 第三段返回 4 个字段。

完成后告诉 Codex：**迁移完成**。不要把数据库密码、Service Role Key 或其他密钥发到聊天中。
