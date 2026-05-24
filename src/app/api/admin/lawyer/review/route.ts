import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';
import { encryptFields, LAWYER_SENSITIVE_FIELDS } from '@/lib/crypto/encryption';

// 发送通知辅助函数
async function sendNotification(supabase: any, userId: string, type: string, data: any) {
  try {
    const templates: Record<string, { title: string; content: string }> = {
      lawyer_review_passed: {
        title: '入驻审核通过',
        content: '恭喜！您已通过律师入驻审核，可以开始接单服务了'
      },
      lawyer_review_failed: {
        title: '入驻审核未通过',
        content: `抱歉，您的律师入驻申请未通过：${data.reason || '资料不符合要求'}`
      },
    };
    const template = templates[type];
    if (template) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title: template.title,
        content: data.content || template.content,
        related_id: data.applicationId || null,
        is_read: false,
      });
    }
  } catch (e) {
    console.error('发送通知失败:', e);
  }
}

// GET - 验证管理员身份并返回方法提示（与其他管理API保持一致的401行为）
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  return NextResponse.json(
    { success: false, error: '请使用 PUT 方法提交审核操作' },
    { status: 405 }
  );
}

// PUT - 审核律师入驻申请
export async function PUT(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }

  try {
    const body = await request.json();
    const { applicationId, id, action, reason } = body;

    // 兼容两种参数名
    const targetId = applicationId || id;

    if (!targetId || !action) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // 先查询申请记录获取user_id
    const { data: appData, error: fetchError } = await supabase
      .from('lawyer_applications')
      .select('*')
      .eq('id', targetId)
      .single();
    
    if (fetchError || !appData) {
      return NextResponse.json({ success: false, error: '查询申请记录失败' }, { status: 500 });
    }
    
    const updates: Record<string, unknown> = {
      review_status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
    };

    if (action === 'approve') {
      // 计算会员到期日（审核通过后18个月，与支付入驻统一）
      const now = new Date();
      const memberStartingAt = now.toISOString();
      const memberExpiresAt = new Date(now);
      memberExpiresAt.setMonth(memberExpiresAt.getMonth() + 18);
      updates.member_expires_at = memberExpiresAt.toISOString(); // 同步到 lawyer_applications
      updates.member_starting_at = memberStartingAt; // 会员起始日
      updates.review_remark = null; // 清除之前可能存在的拒绝原因
    } else {
      // 审核拒绝，记录拒绝原因到 review_remark 字段
      updates.review_remark = reason || '资料不符合要求';
    }

    const { data: updatedApp, error: appError } = await supabase
      .from('lawyer_applications')
      .update(updates)
      .eq('id', targetId)
      .select()
      .single();

    if (appError) {
      return NextResponse.json({ success: false, error: appError.message }, { status: 500 });
    }

    // 发送通知
    if (appData.user_id) {
      if (action === 'approve') {
        await sendNotification(supabase, appData.user_id, 'lawyer_review_passed', {
          applicationId: targetId,
        });
      } else {
        await sendNotification(supabase, appData.user_id, 'lawyer_review_failed', {
          reason: reason || '资料不符合要求',
          applicationId: targetId,
        });
      }
    }

    // 如果审核通过，同时在 lawyers 表创建/更新记录
    if (action === 'approve') {
      // 先检查是否已存在（lawyers 表以 phone 作为用户标识）
      const { data: existingLawyer } = await supabase
        .from('lawyers')
        .select('id')
        .eq('phone', appData.phone)
        .single();

      // 🔧 如果 appData.user_id 为空，通过 phone 反查补全
      let effectiveUserId = appData.user_id;
      if (!effectiveUserId && appData.phone) {
        const { data: matchedUser } = await supabase
          .from('users')
          .select('id')
          .eq('phone', appData.phone)
          .maybeSingle();
        if (matchedUser) {
          effectiveUserId = matchedUser.id.toString();
          // 同时回写 lawyer_applications 的 user_id
          await supabase
            .from('lawyer_applications')
            .update({ user_id: effectiveUserId })
            .eq('id', targetId);
        }
      }

      if (!existingLawyer) {
        // 🔧 解析申请表中的 specialties（可能是字符串或JSON数组）
        let specialtiesArr: string[] = [];
        if (appData.specialties) {
          try {
            specialtiesArr = typeof appData.specialties === 'string'
              ? JSON.parse(appData.specialties)
              : appData.specialties;
          } catch {
            specialtiesArr = [appData.specialties];
          }
        }

        // 创建律师记录 - 字段名与前端 profile 页面一致
        let lawyerData: Record<string, unknown> = {
          user_id: effectiveUserId,  // 🔑 关联用户表，律师登录时匹配
          phone: appData.phone,
          name: appData.name,                     // ✅ 前端读取 lawyer.name
          real_name: appData.name,                // 保留兼容旧字段
          wechat: appData.wechat,
          email: appData.email || null,           // ✅ 新增：邮箱
          title: appData.title || null,           // ✅ 新增：头衔/职位
          intro: appData.intro || null,           // ✅ 新增：个人简介
          // license_number 映射到 license_no
          license_no: appData.license_number || null,
          // ✅ specialties 使用数组格式（与前端一致）
          specialties: specialtiesArr,
          // ✅ 会员有效期：审核通过后18个月
          member_expires_at: memberExpiresAt.toISOString(),
          member_starting_at: new Date().toISOString(),
          // 🔢 从业年限默认值（可后续修改）
          working_years: appData.working_years || 0,
          // 额外信息存入 bio（执照图片等敏感信息）
          bio: JSON.stringify({
            lawFirm: appData.law_firm,
            education: appData.education,
            gender: appData.gender,
            licenseImages: appData.license_images,
            idCardImages: appData.id_card_images,
          }),
          status: 'active',
          is_available: true,                     // ✅ 默认可接单
          max_orders: 50,                         // ✅ 默认最大接单量
          current_orders: 0,
          rating: 5.0,                            // ✅ 初始好评率
          response_rate: 100,                     // ✅ 初始响应率
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // 🔒 加密敏感身份字段
        lawyerData = encryptFields(lawyerData, LAWYER_SENSITIVE_FIELDS);

        const { error: lawyerError } = await supabase
          .from('lawyers')
          .insert(lawyerData);

        if (lawyerError) {
          console.error('创建律师记录失败:', lawyerError);
          // 不阻塞主流程，记录错误但仍然返回成功
        }
      } else {
        // 已存在的律师记录，更新会员有效期（起始日不变，只续到期日）和状态
        const { error: updateError } = await supabase
          .from('lawyers')
          .update({
            status: 'active',
            is_available: true,
            member_expires_at: memberExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLawyer.id);

        if (updateError) {
          console.error('更新律师记录失败:', updateError);
        }
      }
    }

    return NextResponse.json({ success: true, message: action === 'approve' ? '已通过审核' : '已拒绝申请', data: updatedApp });
  } catch (error) {
    console.error('审核操作失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
