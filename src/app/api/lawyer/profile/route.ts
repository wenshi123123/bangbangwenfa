import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { decryptFields, encryptFields, LAWYER_SENSITIVE_FIELDS } from '@/lib/crypto/encryption';

export async function GET(request: NextRequest) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  // 🔧 确保有律师ID（不再死卡 userType，兼容既有用户即是律师的场景）
  const lawyerId = auth.lawyerId;
  if (!lawyerId) {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }
  
  try {
    const supabase = getSupabaseAdmin();
    
    // 🩺 诊断日志
    console.log('[Profile API] 请求参数:', { lawyerId, lawyerIdType: typeof lawyerId, userId: auth.userId, phone: auth.phone });
    
    // 优先用 lawyerId 查询（UUID from lawyers表）
    let { data, error } = await supabase
      .from('lawyers')
      .select('id, phone, name, real_name, nickname, avatar_url, wechat, email, title, intro, specialties, member_expires_at, member_starting_at, is_available, max_orders, current_orders, rating, response_rate, status, license_no, working_years, province, city, specialization, bio, package_type, selected_packages, online_status, created_at, updated_at, user_id, gender, law_firm, education, graduated_school')
      .eq('id', String(lawyerId))
      .maybeSingle();
    
    console.log('[Profile API] 主查询结果:', { found: !!data, error: error?.message, dataId: data?.id, memberExp: data?.member_expires_at, memberStart: data?.member_starting_at });
    
    // 🔧 兜底：如果 lawyerId 匹配不上（如旧 token 存的是整数 ID），按 phone 查询
    if (!data && !error && auth.phone) {
      console.log('[Profile API] 主查询未命中，使用 phone 兜底:', auth.phone);
      const fallback = await supabase
        .from('lawyers')
        .select('id, phone, name, real_name, nickname, avatar_url, wechat, email, title, intro, specialties, member_expires_at, member_starting_at, is_available, max_orders, current_orders, rating, response_rate, status, license_no, working_years, province, city, specialization, bio, package_type, selected_packages, online_status, created_at, updated_at, user_id, gender, law_firm, education, graduated_school')
        .eq('phone', auth.phone)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
      console.log('[Profile API] phone兜底结果:', { found: !!data, error: error?.message, dataId: data?.id, memberExp: data?.member_expires_at, memberStart: data?.member_starting_at });
    }
    
    // 🔧 二次兜底：按 user_id 查询
    if (!data && !error && auth.userId) {
      console.log('[Profile API] 仍未命中，使用 user_id 兜底:', auth.userId);
      const fallback = await supabase
        .from('lawyers')
        .select('id, phone, name, real_name, nickname, avatar_url, wechat, email, title, intro, specialties, member_expires_at, member_starting_at, is_available, max_orders, current_orders, rating, response_rate, status, license_no, working_years, province, city, specialization, bio, package_type, selected_packages, online_status, created_at, updated_at, user_id, gender, law_firm, education, graduated_school')
        .eq('user_id', String(auth.userId))
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
      console.log('[Profile API] user_id兜底结果:', { found: !!data, error: error?.message, dataId: data?.id, memberExp: data?.member_expires_at, memberStart: data?.member_starting_at });
    }
    
    if (error || !data) {
      console.log('[Profile API] ❌ 最终未找到律师记录');
      return NextResponse.json({ success: false, error: error?.message || '律师不存在' }, { status: 404 });
    }
    
    console.log('[Profile API] ✅ 返回律师数据:', { id: data.id, memberExp: data.member_expires_at, memberStart: data.member_starting_at });
    
    // 查询统计数据
    const { count: totalCount } = await supabase
      .from('consult_orders')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_lawyer_id', data.id);
    
    const { count: pendingCount } = await supabase
      .from('consult_orders')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_lawyer_id', data.id)
      .eq('assignment_status', 'pending');
    
    const { count: confirmedCount } = await supabase
      .from('consult_orders')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_lawyer_id', data.id)
      .in('assignment_status', ['confirmed', 'accepted']);
    
    const total = totalCount || 0;
    const pending = pendingCount || 0;
    const confirmed = confirmedCount || 0;
    
    // 🔒 解密敏感字段后返回
    const safeData = decryptFields(data, LAWYER_SENSITIVE_FIELDS);
    
    // 解析 selected_packages（可能是 JSON 字符串）
    let parsedSelectedPackages: string[] = [];
    if (safeData.selected_packages) {
      try {
        parsedSelectedPackages = typeof safeData.selected_packages === 'string'
          ? JSON.parse(safeData.selected_packages)
          : safeData.selected_packages as string[];
      } catch {
        parsedSelectedPackages = [];
      }
    }
    
    // 从 bio JSON 中提取 law_firm
    let extractedLawFirm: string | null = null;
    if (safeData.bio) {
      try {
        const bioObj = typeof safeData.bio === 'string' ? JSON.parse(safeData.bio) : safeData.bio;
        extractedLawFirm = bioObj?.lawFirm || null;
      } catch { /* ignore parse error */ }
    }

    // 🌟 优先从 lawyers 表读取这 4 个字段（审核通过后写入的目标表）
    // 如果 lawyers 表中为空，再从 lawyer_applications 兜底读取
    const lawyersDirectFields = {
      gender: safeData.gender || null,
      education: safeData.education || null,
      graduated_school: safeData.graduated_school || null,
      law_firm: safeData.law_firm || extractedLawFirm || null,
    };

    // 🔍 从 lawyer_applications 获取入驻表单额外字段（仅作为兜底）
    let fallbackExtraFields: Record<string, unknown> = {};
    try {
      const { data: appData } = await supabase
        .from('lawyer_applications')
        .select('gender, education, graduated_school, law_firm')
        .eq('user_id', String(auth.userId))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (appData) {
        fallbackExtraFields = {
          gender: appData.gender || null,
          education: appData.education || null,
          graduated_school: appData.graduated_school || null,
          law_firm: appData.law_firm || null,
        };
      }
    } catch { /* ignore */ }

    // 合并：lawyers 表优先，application 兜底
    const extraFields = {
      gender: lawyersDirectFields.gender || fallbackExtraFields.gender || null,
      education: lawyersDirectFields.education || fallbackExtraFields.education || null,
      graduated_school: lawyersDirectFields.graduated_school || fallbackExtraFields.graduated_school || null,
      law_firm: lawyersDirectFields.law_firm || fallbackExtraFields.law_firm || null,
    };
    
    return NextResponse.json({ 
      success: true,
      _v: 'v3-package-support',
      data: {
        ...safeData,
        selected_packages: parsedSelectedPackages,
        ...extraFields,
        stats: {
          total: total,
          pending: pending,
          confirmed: confirmed
        }
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-API-Version': 'v3-package-support',
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  // 🔧 确保有律师ID
  const lawyerId = auth.lawyerId;
  if (!lawyerId) {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }
  
  try {
    const body = await request.json();

    // 🔒 安全策略：仅允许以下非敏感字段直接修改（无需审核）
    const DIRECT_UPDATE_FIELDS = [
      'avatar_url',   // 头像（非敏感，可自由修改）
      'nickname',     // 昵称（非敏感，不影响业务）
    ];

    // 敏感字段白名单（所有敏感字段必须走提交审核流程）
    const SENSITIVE_FIELDS = [
      'name', 'real_name', 'province', 'city',
      'specialization', 'specialties', 'bio', 'license_no', 'phone', 'wechat',
      'title', 'intro', 'working_years', 'email',
      'law_firm', 'graduated_school', 'gender', 'education',
    ];

    // 检查是否包含敏感字段
    const sensitiveUpdates = SENSITIVE_FIELDS.filter(f => body[f] !== undefined);
    if (sensitiveUpdates.length > 0) {
      return NextResponse.json({
        success: false,
        error: `以下字段修改需提交审核：${sensitiveUpdates.join('、')}。请前往律师资料页面提交修改申请。`,
        requireReview: true,
        sensitiveFields: sensitiveUpdates,
      }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const field of DIRECT_UPDATE_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: '无有效更新字段' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lawyers')
      .update(updates)
      .eq('id', String(lawyerId))
      .select()
      .maybeSingle();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, lawyer: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
