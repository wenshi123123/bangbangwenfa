-- ============================================
-- 安全增强：为 users 和 consult_orders 表添加用户级 RLS 策略
-- 目的：作为后端代码的双重防护，即使用户通过 anon key 直接访问也无法越权操作
-- 创建日期：2026-05-20
-- ============================================

-- ============================================
-- 1. users 表 - 用户只能读取/更新自己的记录
-- ============================================

-- 注意：如果策略已存在，此操作会失败。可以先删除再创建。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own profile' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can view own profile" ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid()::text = id::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own profile' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can update own profile" ON users
      FOR UPDATE
      TO authenticated
      USING (auth.uid()::text = id::text)
      WITH CHECK (auth.uid()::text = id::text);
  END IF;
END $$;

-- ============================================
-- 2. consult_orders 表 - 用户只能查看自己的订单
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own orders' AND tablename = 'consult_orders'
  ) THEN
    CREATE POLICY "Users can view own orders" ON consult_orders
      FOR SELECT
      TO authenticated
      USING (auth.uid()::text = user_id::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can create own orders' AND tablename = 'consult_orders'
  ) THEN
    CREATE POLICY "Users can create own orders" ON consult_orders
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid()::text = user_id::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own orders' AND tablename = 'consult_orders'
  ) THEN
    CREATE POLICY "Users can update own orders" ON consult_orders
      FOR UPDATE
      TO authenticated
      USING (auth.uid()::text = user_id::text)
      WITH CHECK (auth.uid()::text = user_id::text);
  END IF;
END $$;

-- ============================================
-- 3. notifications 表 - 用户只能查看自己的通知
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own notifications' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications" ON notifications
      FOR SELECT
      TO authenticated
      USING (auth.uid()::text = user_id::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own notifications' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" ON notifications
      FOR UPDATE
      TO authenticated
      USING (auth.uid()::text = user_id::text)
      WITH CHECK (auth.uid()::text = user_id::text);
  END IF;
END $$;

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ 用户级 RLS 策略已添加（跳过已存在的策略）';
  RAISE NOTICE '';
  RAISE NOTICE '策略说明：';
  RAISE NOTICE '  - users: 用户只能读/改自己的记录';
  RAISE NOTICE '  - consult_orders: 用户只能查/建/改自己的订单';
  RAISE NOTICE '  - notifications: 用户只能查/改自己的通知';
  RAISE NOTICE '';
  RAISE NOTICE 'service_role 策略仍然保有完全访问权限';
END $$;
