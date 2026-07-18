import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { notifyOrder } from '@/lib/notify/webhook';

/**
 * 律师入驻申请 API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      gender,
      lawFirm,
      licenseNumber,
      specialties,
      education,
      graduatedSchool,
      workingYears,
      city,
      phone,
      wechat,
      licenseImages,
      idCardImages,
      educationImages,
      packageType,
      packagePrice,
      selectedPackages,
      userId: bodyUserId,
    } = body;

    // 🔧 兜底：如果 body 中没有 userId，尝试从 x-user-info header 获取
    let userId = bodyUserId;
    if (!userId) {
      try {
        const userInfoHeader = request.headers.get('x-user-info');
        if (userInfoHeader) {
          const userInfo = JSON.parse(userInfoHeader);
          userId = userInfo.id;
        }
      } catch {
        // header 解析失败，忽略
      }
    }

    // 验证必填字段
    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: '姓名和手机号必填' },
        { status: 400 }
      );
    }

    if (!/^\d{11}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: '联系电话必须为11位数字' },
        { status: 400 }
      );
    }

    // 验证套餐选择
    if (!selectedPackages || selectedPackages.length === 0) {
      return NextResponse.json(
        { success: false, error: '请至少选择一个套餐' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 检查是否已是正式律师（在 lawyers 表中）
    if (userId) {
      try {
        const { data: existingLawyer } = await supabase
          .from('lawyers')
          .select('id, real_name, status')
          .eq('user_id', userId)
          .single();

        if (existingLawyer) {
          return NextResponse.json({
            success: true,
            data: {
              message: '您已是认证律师，无需重复入驻',
              lawyerId: existingLawyer.id,
              isExisting: true,
            },
          });
        }
      } catch (checkError) {
        // lawyers 表可能不存在或用户不在其中，继续检查申请表
      }
    }

    // 检查是否有待处理的申请（先尝试查询，如果表不存在则跳过）
    if (userId) {
      try {
        const { data: existing } = await supabase
          .from('lawyer_applications')
          .select('id, payment_status, review_status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existing) {
          if (existing.payment_status === 'paid' && existing.review_status === 'approved') {
            return NextResponse.json({
              success: true,
              data: {
                applicationId: existing.id,
                status: 'approved',
                message: '您的入驻申请已审核通过，请前往登录',
              },
            });
          }
          
          return NextResponse.json({
            success: true,
            data: {
              applicationId: existing.id,
              status: existing.payment_status,
              message: '您已有进行中的申请',
            },
          });
        }
      } catch (checkError) {
        console.warn('lawyer_applications 表不存在，跳过重复检查:', checkError);
      }
    }

    // 创建申请记录（如果表不存在则返回错误和建表SQL）
    try {
      const { data: application, error } = await supabase
        .from('lawyer_applications')
        .insert({
          name,
          gender,
          law_firm: lawFirm,
          license_number: licenseNumber,
          specialties: JSON.stringify(specialties || []),
          education,
          graduated_school: graduatedSchool || '',
          working_years: workingYears || 0,
          city: city || '',
          phone,
          wechat,
          license_images: licenseImages || [],
          id_card_images: idCardImages || [],
          education_images: educationImages || [],
          package_type: packageType,
          package_price: packagePrice,
          selected_packages: JSON.stringify(selectedPackages),
          payment_status: 'pending',
          user_id: userId,
          review_status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('创建律师申请失败:', error);
        return NextResponse.json(
          { success: false, error: '创建申请失败，请重试' },
          { status: 500 }
        );
      }

      // Webhook 通知
      notifyOrder({
        type: 'Registration',
        userName: name || phone || '未知',
        phone,
        amount: packagePrice,
        detail: `套餐：${(selectedPackages || []).map((p: string) => p === 'civil_premium' ? '民事臻选' : '刑事臻选').join(' + ') || '未知'}`,
        orderId: application.id,
        status: 'Pending Review',
        event: 'created',
      });

      return NextResponse.json({
        success: true,
        data: {
          applicationId: application.id,
          status: 'pending',
        },
      });
    } catch (insertError: any) {
      console.error('插入律师申请失败:', insertError);
      
      // 表不存在时的友好错误 - 返回建表SQL
      if (insertError?.message?.includes('relation') || insertError?.code === '42P01' || insertError?.message?.includes('does not exist')) {
        const createTableSQL = `
CREATE TABLE IF NOT EXISTS lawyer_applications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50),
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(10),
  law_firm VARCHAR(200),
  license_number VARCHAR(200),
  specialties TEXT,
  education VARCHAR(200),
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

CREATE INDEX IF NOT EXISTS idx_lawyer_applications_user_id ON lawyer_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_applications_payment ON lawyer_applications(payment_status);
CREATE INDEX IF NOT EXISTS idx_lawyer_applications_review ON lawyer_applications(review_status);
        `.trim();
        
        return NextResponse.json(
          { 
            success: false, 
            error: '数据库表缺失，请联系管理员',
            details: 'lawyer_applications table does not exist',
            sql: createTableSQL,
            instructions: [
              '请到 Supabase Dashboard 的 SQL Editor 执行 sql 字段中的 SQL',
              '执行完成后重启服务器即可'
            ]
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: '创建申请失败，请重试' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('创建律师申请失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
