import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { notifyOrder } from '@/lib/notify/webhook';
import { createConsultPaymentHandoff } from '@/lib/payment/payment-handoff';
import { resolveUserNickname } from '@/lib/user/resolve-nickname';
import { loadConfiguredPrices } from '@/lib/lawyer/price-config';
import { paymentExpiresAt } from '@/lib/payment/order-lifecycle';

function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD${timestamp}${random}`;
}

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
      planId,
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
      service_type
    } = body;

    // 支持新旧两种数据格式
    const finalCaseType = caseType || case_type || 'other';
    const finalCaseDescription = caseDescription || case_description || '';
    const finalServiceType = Array.isArray(serviceType) ? serviceType.join(',') : (service_type || 'consult');
    const supabase = getSupabaseAdmin();
    const finalContactName = await resolveUserNickname(supabase, userId);
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

    if (!['civil', 'criminal'].includes(finalCategory)) {
      return NextResponse.json({ success: false, error: '咨询分类无效' }, { status: 400 });
    }
    if (typeof planId !== 'string' || !['basic', 'standard', 'advanced'].includes(planId)) {
      return NextResponse.json({ success: false, error: '请选择有效的咨询套餐' }, { status: 400 });
    }

    let finalServicePrice: number;
    try {
      const configuredPrices = await loadConfiguredPrices(supabase, finalCategory, [planId]);
      finalServicePrice = configuredPrices.get(planId)!.price;
    } catch (priceError) {
      console.error('读取咨询套餐价格失败:', priceError);
      return NextResponse.json({ success: false, error: '咨询套餐价格暂不可用，请稍后重试' }, { status: 503 });
    }

    // 统一的 15 分钟支付生命周期：先释放超时订单以及历史上没有过期时间的旧订单。
    // 这样旧订单不会永久占用同一用户/分类的下单入口。
    const lifecycleNow = new Date();
    const { error: expireError } = await supabase
      .from('consult_orders')
      .update({
        payment_status: 'closed',
        closed_at: lifecycleNow.toISOString(),
        close_reason: '支付超时',
        updated_at: lifecycleNow.toISOString(),
      })
      .eq('user_id', userId)
      .eq('category', finalCategory)
      .in('payment_status', ['pending', 'paying'])
      .or(`payment_expires_at.lt.${lifecycleNow.toISOString()},payment_expires_at.is.null`);
    if (expireError) {
      console.error('清理过期咨询订单失败:', expireError);
      return NextResponse.json({ success: false, error: '检查现有订单失败，请稍后重试' }, { status: 500 });
    }

    // 同一用户、同一咨询分类只保留一笔有效支付订单，避免重复下单和重复扣款。
    const { data: activeOrder, error: activeOrderError } = await supabase
      .from('consult_orders')
      .select('id, order_no, case_type, case_title, service_price, payment_status, payment_expires_at, plan_id')
      .eq('user_id', userId)
      .eq('category', finalCategory)
      .eq('case_type', finalCaseType)
      .eq('plan_id', planId)
      .in('payment_status', ['pending', 'paying'])
      .gt('payment_expires_at', lifecycleNow.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeOrderError) {
      console.error('查询有效咨询订单失败:', activeOrderError);
      return NextResponse.json({ success: false, error: '检查现有订单失败，请稍后重试' }, { status: 500 });
    }

    if (activeOrder) {
      return NextResponse.json({
        success: true,
        data: {
          orderId: activeOrder.id,
          orderNo: activeOrder.order_no,
          reusedOrder: {
            caseType: activeOrder.case_type,
            caseTitle: activeOrder.case_title,
            planId: activeOrder.plan_id,
            amount: activeOrder.service_price,
            paymentStatus: activeOrder.payment_status,
            paymentExpiresAt: activeOrder.payment_expires_at,
          },
          reused: true,
          paymentHandoffToken: createConsultPaymentHandoff(activeOrder.id, userId),
        },
      });
    }

    const orderNo = generateOrderNo();

    // 插入订单
    const { data, error } = await supabase
      .from('consult_orders')
      .insert({
        order_no: orderNo,
        contact_name: finalContactName,
        contact_phone: finalContactPhone || null,
        contact_wechat: finalContactWechat || null,
        case_type: finalCaseType,
        case_title: finalCaseTitle,
        case_description: finalCaseDescription,
        service_type: finalServiceType,
        service_price: finalServicePrice,
        plan_id: planId,
        payment_status: 'pending',
        payment_expires_at: paymentExpiresAt(lifecycleNow).toISOString(),
        user_id: userId,
        openid: finalOpenid,
        category: finalCategory,
        invite_code: finalInviteCode
      })
      .select('id')
      .single();

    if (error) {
      // 数据库唯一索引兜底并发请求：读取先创建成功的有效订单并复用。
      if (error.code === '23505') {
        const { data: concurrentOrder } = await supabase
          .from('consult_orders')
          .select('id, order_no, case_type, case_title, service_price, payment_status, payment_expires_at, plan_id')
          .eq('user_id', userId)
          .eq('category', finalCategory)
          .eq('case_type', finalCaseType)
          .eq('plan_id', planId)
          .in('payment_status', ['pending', 'paying'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (concurrentOrder) {
          return NextResponse.json({
            success: true,
            data: {
              orderId: concurrentOrder.id,
              orderNo: concurrentOrder.order_no,
              reusedOrder: {
                caseType: concurrentOrder.case_type,
                caseTitle: concurrentOrder.case_title,
                planId: concurrentOrder.plan_id,
                amount: concurrentOrder.service_price,
                paymentStatus: concurrentOrder.payment_status,
                paymentExpiresAt: concurrentOrder.payment_expires_at,
              },
              reused: true,
              paymentHandoffToken: createConsultPaymentHandoff(concurrentOrder.id, userId),
            },
          });
        }
      }
      console.error('创建订单失败:', error);
      return NextResponse.json(
        { success: false, error: '创建订单失败，请重试' },
        { status: 500 }
      );
    }

    const createdOrderId = data?.id;
    if (!createdOrderId) {
      console.error('创建订单成功但未返回订单ID');
      return NextResponse.json(
        { success: false, error: '创建订单失败，请重试' },
        { status: 500 }
      );
    }

    // Webhook 通知
    notifyOrder({
      type: 'Consult',
      userName: finalContactName,
      phone: finalContactPhone,
      amount: finalServicePrice,
      detail: `${finalCategory === 'criminal' ? '刑事' : '民事'}咨询 - ${finalServiceType}`,
      orderId: orderNo,
      status: 'Pending Payment',
      event: 'created',
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: createdOrderId,
        paymentHandoffToken: createConsultPaymentHandoff(createdOrderId, userId),
      }
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
