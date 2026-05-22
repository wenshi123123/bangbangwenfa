# 帮帮问法 - 环境配置指南

## 1. Supabase 配置

### 1.1 创建 Supabase 项目
1. 访问 [Supabase](https://supabase.com) 并创建新项目
2. 获取以下凭据：
   - Project URL
   - `anon` public key
   - `service_role` secret key (仅用于服务端)

### 1.2 环境变量配置

创建 `.env.production` 文件（参考 `.env.production.example`）:

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 或者使用 COZE_ 前缀
COZE_SUPABASE_URL=https://your-project.supabase.co
COZE_SUPABASE_ANON_KEY=your-anon-key
COZE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 1.3 数据库初始化

在 Supabase SQL Editor 中执行 `scripts/init-database.sql` 创建必要的表：

```bash
# 或者通过 Supabase CLI
supabase db execute -f scripts/init-database.sql
```

**必须创建的表：**

1. **sms_verification_codes** - 存储短信验证码
   - 包含字段：id, phone, code, type, ip, attempts, used, expires_at, created_at, used_at

## 2. 腾讯云短信配置

### 2.1 创建腾讯云账号
1. 访问 [腾讯云](https://cloud.tencent.com)
2. 开通短信服务

### 2.2 配置短信签名和模板
1. 在短信服务中创建签名（需要审核）
2. 创建短信模板，验证码格式示例：`您的验证码是{1}，{2}分钟内有效`

### 2.3 环境变量配置

```env
TENCENT_SECRET_ID=your-secret-id
TENCENT_SECRET_KEY=your-secret-key
TENCENT_SMS_APP_ID=your-sms-app-id
TENCENT_SMS_SIGN_NAME=您的签名名称
TENCENT_SMS_TEMPLATE_ID=your-template-id
```

## 3. 常见问题排查

### 问题：显示"服务器错误，请稍后重试"

可能原因及解决方案：

1. **数据库表不存在**
   - 解决方案：执行 `scripts/init-database.sql` 创建表

2. **Supabase 环境变量未配置**
   - 检查 `.env.production` 文件是否存在
   - 确认环境变量已正确设置

3. **数据库连接失败**
   - 检查 Supabase URL 和 Key 是否正确
   - 确认 Supabase 项目状态正常

4. **表结构不匹配**
   - 检查 `sms_verification_codes` 表字段是否与代码一致
   - 确认 RLS 策略已正确配置

### 问题：验证码发送成功但验证失败

1. 检查 `verifyCode` 函数中的表查询条件
2. 确认验证码未过期（默认 5 分钟）
3. 确认验证码类型匹配（login/register）

### 问题：短信发送失败

1. 检查腾讯云短信配置
2. 确认签名和模板已审核通过
3. 检查账户余额

## 4. 测试模式

如果未配置腾讯云短信，代码会自动进入 Mock 模式：
- 验证码会打印到服务器控制台
- 便于本地开发测试

查看控制台日志：`[SMS Mock] 发送验证码到 xxx: 123456`
