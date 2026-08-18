import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { notifyOrder } from '@/lib/notify/webhook';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { LAWYER_ONBOARDING_PACKAGES, validateUploadRequirements } from '@/lib/lawyer/package-config';
import { loadLawyerPackagePrices } from '@/lib/lawyer/price-config';
import { resolveUserNickname } from '@/lib/user/resolve-nickname';
import { isBlockingApplication } from '@/lib/lawyer/application-state';

/**
 * 律师入驻申请 API
 */
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.success || !auth.userId) {
      return unauthorizedResponse(auth.error || '请先登录');
    }

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
      selectedPackages,
      applicationMode = 'paid',
      experienceReason,
      sourceApplicationId,
    } = body;
    const userId = String(auth.userId);
    const parsedSourceApplicationId = sourceApplicationId == null || sourceApplicationId === ''
      ? null
      : Number(sourceApplicationId);
    if (parsedSourceApplicationId !== null && !Number.isInteger(parsedSourceApplicationId)) {
      return NextResponse.json({ success: false, error: '来源申请编号无效' }, { status: 400 });
    }
    const isComplimentaryRequest = applicationMode === 'complimentary';
    if (!['paid', 'complimentary'].includes(applicationMode)) {
      return NextResponse.json({ success: false, error: '入驻方式无效' }, { status: 400 });
    }
    if (isComplimentaryRequest && (typeof experienceReason !== 'string' || !experienceReason.trim())) {
      return NextResponse.json({ success: false, error: '请填写特邀申请理由' }, { status: 400 });
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

    if (!Array.isArray(selectedPackages) || selectedPackages.some((item) => typeof item !== 'string')) {
      return NextResponse.json(
        { success: false, error: '套餐选择格式不正确' },
        { status: 400 },
      );
    }

    if (!validateUploadRequirements({ licenseImages, idCardImages, educationImages })) {
      return NextResponse.json(
        { success: false, error: '请按要求补齐律师执业证 2 张、身份证照片 3 张、学历证明 1 张' },
        { status: 400 },
      );
    }

    const validPackageIds = new Set(LAWYER_ONBOARDING_PACKAGES.map((item) => item.id));
    if (selectedPackages.some((item) => !validPackageIds.has(item as typeof LAWYER_ONBOARDING_PACKAGES[number]['id']))) {
      return NextResponse.json(
        { success: false, error: '套餐选择无效' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    let sourceRevisionNo = 0;

    // 重新申请只能从当前用户自己的已拒绝申请发起，旧申请保持只读。
    if (parsedSourceApplicationId !== null) {
      const { data: sourceApplication, error: sourceError } = await supabase
        .from('lawyer_applications')
        .select('id, user_id, review_status, revision_no')
        .eq('id', parsedSourceApplicationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (sourceError || !sourceApplication) {
        return NextResponse.json({ success: false, error: '来源申请不存在或无权访问' }, { status: 404 });
      }
      if (sourceApplication.review_status !== 'rejected') {
        return NextResponse.json({ success: false, error: '只有已拒绝的申请可以重新提交' }, { status: 400 });
      }
      sourceRevisionNo = Number(sourceApplication.revision_no) || 1;
    }
    let packagePrices = new Map<string, { price: number }>();
    if (!isComplimentaryRequest) {
      try {
        packagePrices = await loadLawyerPackagePrices(supabase, selectedPackages);
      } catch (priceError) {
        return NextResponse.json(
          { success: false, error: '律师入驻套餐价格尚未配置，请联系管理员' },
          { status: 503 },
        );
      }
    }
    const packageType = selectedPackages[0];
    const packagePrice = isComplimentaryRequest
      ? 0
      : selectedPackages.reduce((total, packageId) => total + packagePrices.get(packageId)!.price, 0);

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
            success: false,
            code: 'LAWYER_ALREADY_ACTIVE',
            error: '您已是认证律师，请前往律师工作台或续费页面。',
            data: {
              lawyerId: existingLawyer.id,
              isExisting: true,
            },
          }, { status: 409 });
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
          .select('id, payment_status, review_status, approval_mode')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existing && isBlockingApplication(existing)) {
          if (existing.payment_status === 'paid' && existing.review_status === 'approved') {
            return NextResponse.json({
              success: false,
              code: 'LAWYER_ALREADY_ACTIVE',
              error: '您已是认证律师，请前往律师工作台或续费页面。',
              data: { applicationId: existing.id, status: 'approved' },
            }, { status: 409 });
          }
          
          return NextResponse.json({
            success: false,
            code: 'APPLICATION_PENDING',
            error: '您已有申请正在审核中，请勿重复提交。',
            data: {
              applicationId: existing.id,
              status: 'pending',
              applicationMode: existing.approval_mode === 'complimentary_requested' ? 'complimentary' : 'paid',
            },
          }, { status: 409 });
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
          approval_mode: isComplimentaryRequest ? 'complimentary_requested' : null,
          review_remark: isComplimentaryRequest ? experienceReason.trim() : null,
          ...(parsedSourceApplicationId !== null
            ? { resubmitted_from_id: parsedSourceApplicationId, revision_no: sourceRevisionNo + 1 }
            : {}),
        })
        .select()
        .single();

      if (error) {
        console.error('创建律师申请失败:', error);
        if (error.code === '23505') {
          const { data: pendingApplication } = await supabase
            .from('lawyer_applications')
            .select('id, payment_status, review_status, approval_mode')
            .eq('user_id', userId)
            .eq('review_status', 'pending')
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (pendingApplication) {
              return NextResponse.json({
              success: false,
              code: 'APPLICATION_PENDING',
              error: '您已有申请正在审核中，请勿重复提交。',
              data: {
                applicationId: pendingApplication.id,
                status: 'pending',
                applicationMode: pendingApplication.approval_mode === 'complimentary_requested' ? 'complimentary' : 'paid',
              },
            }, { status: 409 });
          }
        }
        return NextResponse.json(
          { success: false, error: '创建申请失败，请重试' },
          { status: 500 }
        );
      }

      // Webhook 通知
      notifyOrder({
        type: 'Registration',
        userName: await resolveUserNickname(supabase, userId),
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
  resubmitted_from_id INTEGER REFERENCES lawyer_applications(id) ON DELETE RESTRICT,
  revision_no INTEGER NOT NULL DEFAULT 1,
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
