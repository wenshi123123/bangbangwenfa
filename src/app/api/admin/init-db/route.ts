import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

/**
 * 初始化数据库表
 * 仅用于开发环境，生产环境请使用 Supabase Dashboard
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const supabase = getSupabaseAdmin();

    // 尝试创建 lawyer_applications 表
    // 注意：Supabase 不支持通过 REST API 执行 DDL
    // 这里提供一个友好的错误提示

    const sql = `
      CREATE TABLE IF NOT EXISTS lawyer_applications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50),
        name VARCHAR(100) NOT NULL,
        gender VARCHAR(10),
        law_firm VARCHAR(200),
        license_number VARCHAR(50),
        specialties TEXT,
        education VARCHAR(50),
        phone VARCHAR(20),
        wechat VARCHAR(100),
        license_images TEXT[],
        id_card_images TEXT[],
        education_images TEXT[],
        package_type VARCHAR(50),
        package_price INTEGER,
        selected_packages TEXT,
        payment_status VARCHAR(20) DEFAULT 'pending',
        review_status VARCHAR(20) DEFAULT 'pending',
        review_remark TEXT,
        order_no VARCHAR(100),
        wechat_transaction_id VARCHAR(100),
        paid_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Supabase REST API 不支持执行 DDL
    // 返回需要在 Dashboard 执行的 SQL
    return NextResponse.json({
      success: false,
      error: 'Please create the table manually in Supabase Dashboard',
      sql: sql,
      instructions: [
        '1. Open Supabase Dashboard: https://supabase.com/dashboard/project/hznzreihgnosbmdfyeod',
        '2. Go to SQL Editor',
        '3. Paste the SQL below and click "Run"',
        '4. Restart the Next.js server',
      ],
    }, { status: 503 });
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
