import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    
    const userId = auth.userId!;
    const userPhone = auth.phone;

    const body = await request.json();
    const {
      // 新流程字段
      caseType,
      caseDescription,
      serviceType,
      servicePrice,
      contactName,
      contactPhone,
      contactWechat,
      openid,
      category,
      inviteCode,
      // 旧流程字段（兼容）
      contact_name,
      contact_phone,
      contact_wechat,
      case_type,
      case_title,
      case_description,
      service_type,
      service_price
    } = body;

    // 支持新旧两种数据格式
    const finalCaseType = caseType || case_type || 'other';
    const finalCaseDescription = caseDescription || case_description || '';
    const finalServiceType = Array.isArray(serviceType) ? serviceType.join(',') : (service_type || 'consult');
    const finalServicePrice = servicePrice || service_price || 0;
    const finalContactName = contactName || contact_name || '匿名用户';
    // 默认使用 token 中的手机号，如果没有则使用请求中的
    const finalContactPhone = contactPhone || contact_phone || userPhone || '';
    const finalContactWechat = contactWechat || contact_wechat || '';
    const finalOpenid = openid || null;
    const finalCategory = category || 'criminal'; // 默认刑事咨询
    const finalInviteCode = inviteCode || null;

    // 生成案件标题
    const civilCaseTitles: Record<string, string> = {
      contract: '合同纠纷咨询',
      property: '财产纠纷咨询',
      marriage: '婚姻家庭咨询',
      inheritance: '继承纠纷咨询',
      loan: '民间借贷咨询',
      labor: '劳动纠纷咨询',
      traffic: '交通事故咨询',
      medical: '医疗纠纷咨询',
      other: '其他民事咨询'
    };

    const criminalCaseTitles: Record<string, string> = {
      fraud: '诈骗类案件咨询',
      theft: '盗窃类案件咨询',
      assault: '故意伤害案件咨询',
      drugs: '毒品犯罪咨询',
      economy: '经济犯罪咨询',
      traffic: '交通犯罪咨询',
      other: '其他刑事案件咨询'
    };

    const caseTitles = finalCategory === 'civil' ? civilCaseTitles : criminalCaseTitles;
    const finalCaseTitle = case_title || caseTitles[finalCaseType] || (finalCategory === 'civil' ? '民事咨询' : '刑事案件咨询');

    // 验证必填字段
    if (!finalCaseTitle || !finalCaseDescription || !finalServiceType) {
      return NextResponse.json(
        { success: false, error: '请填写完整的必填信息' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 插入订单
    const { data, error } = await supabase
      .from('consult_orders')
      .insert({
        contact_name: finalContactName,
        contact_phone: finalContactPhone || null,
        contact_wechat: finalContactWechat || null,
        case_type: finalCaseType,
        case_title: finalCaseTitle,
        case_description: finalCaseDescription,
        service_type: finalServiceType,
        service_price: finalServicePrice,
        payment_status: 'pending',
        user_id: userId,
        openid: finalOpenid,
        category: finalCategory,
        invite_code: finalInviteCode
      })
      .select('id')
      .single();

    if (error) {
      console.error('创建订单失败:', error);
      return NextResponse.json(
        { success: false, error: '创建订单失败，请重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { orderId: data.id }
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
