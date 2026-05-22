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
      // 审核通过，设置会员到期时间（默认1年）
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      updates.member_expires_at = expiresAt.toISOString();
    } else {
      // 审核拒绝，记录拒绝原因
      updates.rejection_reason = reason || '资料不符合要求';
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

      if (!existingLawyer) {
        // 创建律师记录 - 敏感字段加密后存储
        let lawyerData: Record<string, unknown> = {
          phone: appData.phone,
          real_name: appData.name,
          wechat: appData.wechat,
          // license_number 映射到 license_no
          license_no: appData.license_number || null,
          // specialties 映射到 specialization
          specialization: appData.specialties || '',
          // 额外信息存入 bio
          bio: JSON.stringify({
            lawFirm: appData.law_firm,
            education: appData.education,
            gender: appData.gender,
            licenseImages: appData.license_images,
            idCardImages: appData.id_card_images,
          }),
          status: 'active',
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
      }
    }

    return NextResponse.json({ success: true, message: action === 'approve' ? '已通过审核' : '已拒绝申请', data: updatedApp });
  } catch (error) {
    console.error('审核操作失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
