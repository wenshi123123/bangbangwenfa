/**
 * 律师入驻支付回调 - 微信支付完成后通知此接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;
    
    // ========== 签名验证 ==========
    const signature = headers.get('wechatpay-signature') || '';
    const timestamp = headers.get('wechatpay-timestamp') || '';
    const nonce = headers.get('wechatpay-nonce') || '';
    const serial = headers.get('wechatpay-serial') || '';

    if (!signature || !serial) {
      console.error('律师入驻支付回调缺少签名信息');
      return NextResponse.json({ code: 'FAIL', message: '缺少签名信息' }, { status: 401 });
    }

    const verifyResult = await verifyWechatPaySignature(signature, timestamp, nonce, body, serial);
    if (!verifyResult.valid) {
      console.error('律师入驻支付回调签名验证失败:', verifyResult.reason);
      return NextResponse.json({ code: 'FAIL', message: '签名验证失败' }, { status: 401 });
    }
    console.log('律师入驻支付回调签名验证通过');

    let notifyData: any;
    try { notifyData = JSON.parse(body); } catch {
      return NextResponse.json({ code: 'FAIL', message: 'Invalid JSON' }, { status: 400 });
    }

    console.log('收到律师入驻支付回调:', { transactionId: notifyData.transaction_id, outTradeNo: notifyData.out_trade_no, tradeState: notifyData.trade_state });

    if (notifyData.trade_state !== 'SUCCESS') {
      console.log('支付未成功:', notifyData.trade_state);
      return NextResponse.json({ code: 'FAIL', message: 'Payment not successful' }, { status: 200 });
    }

    const transactionId = notifyData.transaction_id;
    const outTradeNo = notifyData.out_trade_no;
    const supabase = getSupabaseAdmin();

    const { data: application, error: appError } = await supabase
      .from('lawyer_applications').select('*').eq('order_no', outTradeNo).single();

    if (appError || !application) {
      console.error('未找到对应的律师申请:', outTradeNo);
      return NextResponse.json({ code: 'FAIL', message: 'Application not found' }, { status: 200 });
    }

    if (application.payment_status === 'paid') {
      console.log('订单已支付，跳过处理:', outTradeNo);
      return NextResponse.json({ code: 'SUCCESS', message: 'OK' }, { status: 200 });
    }

    const { error: updateError } = await supabase.from('lawyer_applications').update({
      payment_status: 'paid', paid_at: new Date().toISOString(),
      wechat_transaction_id: transactionId, order_no: outTradeNo,
    }).eq('id', application.id);

    if (updateError) {
      console.error('更新支付状态失败:', updateError);
      return NextResponse.json({ code: 'FAIL', message: 'Update failed' }, { status: 500 });
    }

    const calculateMemberExpiry = (baseDate: Date, months: number): Date => {
      const result = new Date(baseDate);
      result.setMonth(result.getMonth() + months);
      return result;
    };

    const applicationUserId = application.user_id ? String(application.user_id) : null;
    let existingLawyer = null;
    if (applicationUserId) {
      const { data: found } = await supabase.from('lawyers').select('id, member_expires_at').eq('user_id', applicationUserId).maybeSingle();
      existingLawyer = found;
    }

    const PACKAGE_MONTHS = 18;

    if (existingLawyer) {
      let newExpiryDate = new Date();
      if (existingLawyer.member_expires_at) {
        const currentExpiry = new Date(existingLawyer.member_expires_at);
        newExpiryDate = currentExpiry > new Date() ? calculateMemberExpiry(currentExpiry, PACKAGE_MONTHS) : calculateMemberExpiry(new Date(), PACKAGE_MONTHS);
      } else {
        newExpiryDate = calculateMemberExpiry(new Date(), PACKAGE_MONTHS);
      }
      await supabase.from('lawyers').update({ member_expires_at: newExpiryDate.toISOString(), membership_status: 'normal' }).eq('id', existingLawyer.id);
      console.log('律师续费成功:', { userId: application.user_id, previousExpiry: existingLawyer.member_expires_at, newExpiry: newExpiryDate.toISOString() });
    } else {
      const expiresAt = calculateMemberExpiry(new Date(), PACKAGE_MONTHS);
      await supabase.from('lawyers').insert({
        user_id: applicationUserId, name: application.name, real_name: application.name,
        phone: application.phone, wechat: application.wechat, license_no: application.license_number,
        specialization: application.specialties, is_active: true, is_available: true,
        member_expires_at: expiresAt.toISOString(), membership_status: 'normal', rating: 5.0, max_orders: 50,
        created_at: new Date().toISOString(),
      });
      console.log('律师账号创建成功:', { userId: application.user_id, name: application.name, expiresAt: expiresAt.toISOString() });
    }

    console.log('律师入驻支付处理成功:', { applicationId: application.id, transactionId, outTradeNo });
    return NextResponse.json({ code: 'SUCCESS', message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('处理律师入驻支付回调失败:', error);
    return NextResponse.json({ code: 'FAIL', message: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ code: 'SUCCESS', message: 'OK' }, { status: 200 });
}
