/**
 * 律师入驻支付回调
 * 微信支付完成后会通知此接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;
    
    // ========== 签名验证（防止伪造回调）==========
    // 微信支付 APIv3 回调签名在 Authorization 头中
    // 格式: WECHATPAY2-SHA256-RSA2048 signature="xxx",serial_no="yyy",nonce_str="...",timestamp="..."
    const authorization = headers.get('authorization') || '';
    const signature = authorization.match(/signature="([^"]+)"/)?.[1] || '';
    const timestamp = headers.get('wechatpay-timestamp') || '';
    const nonce = headers.get('wechatpay-nonce') || '';
    const serial = headers.get('wechatpay-serial') || '';

    if (!signature || !serial) {
      console.error('律师入驻支付回调缺少签名信息');
      return NextResponse.json(
        { code: 'FAIL', message: '缺少签名信息' },
        { status: 401 }
      );
    }

    // 注意：verifyWechatPaySignature 参数顺序为 (signature, timestamp, nonce, body, serialNo)
    const verifyResult = await verifyWechatPaySignature(
      signature,
      timestamp,
      nonce,
      body,
      serial
    );

    if (!verifyResult.valid) {
      console.error('律师入驻支付回调签名验证失败:', verifyResult.reason);
      return NextResponse.json(
        { code: 'FAIL', message: '签名验证失败' },
        { status: 401 }
      );
    }
    console.log('律师入驻支付回调签名验证通过');

    // 解析 JSON 数据（微信支付 v3 通知可能是 JSON 格式）
    let notifyData: any;
    try {
      notifyData = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { code: 'FAIL', message: 'Invalid JSON' },
        { status: 400 }
      );
    }

    console.log('收到律师入驻支付回调:', {
      transactionId: notifyData.transaction_id,
      outTradeNo: notifyData.out_trade_no,
      tradeState: notifyData.trade_state,
    });

    // 验证交易状态
    if (notifyData.trade_state !== 'SUCCESS') {
      console.log('支付未成功:', notifyData.trade_state);
      return NextResponse.json(
        { code: 'FAIL', message: 'Payment not successful' },
        { status: 200 }
      );
    }

    const transactionId = notifyData.transaction_id;
    const outTradeNo = notifyData.out_trade_no;

    const supabase = getSupabaseAdmin();

    // 通过订单号查找律师申请
    const { data: application, error: appError } = await supabase
      .from('lawyer_applications')
      .select('*')
      .eq('order_no', outTradeNo)
      .single();

    if (appError || !application) {
      console.error('未找到对应的律师申请:', outTradeNo);
      return NextResponse.json(
        { code: 'FAIL', message: 'Application not found' },
        { status: 200 }
      );
    }

    // 检查是否已处理过
    if (application.payment_status === 'paid') {
      console.log('订单已支付，跳过处理:', outTradeNo);
      return NextResponse.json(
        { code: 'SUCCESS', message: 'OK' },
        { status: 200 }
      );
    }

    // 更新申请状态为已支付
    const { error: updateError } = await supabase
      .from('lawyer_applications')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        wechat_transaction_id: transactionId,
        order_no: outTradeNo,
      })
      .eq('id', application.id);

    if (updateError) {
      console.error('更新支付状态失败:', updateError);
      return NextResponse.json(
        { code: 'FAIL', message: 'Update failed' },
        { status: 500 }
      );
    }

    // 计算会员到期时间（套餐固定18个月）
    const calculateMemberExpiry = (baseDate: Date, months: number): Date => {
      const result = new Date(baseDate);
      result.setMonth(result.getMonth() + months);
      return result;
    };

    // 获取律师信息（检查是否已存在）
    const applicationUserId = application.user_id ? String(application.user_id) : null;
    let existingLawyer = null;
    if (applicationUserId) {
      const { data: found } = await supabase
        .from('lawyers')
        .select('id, member_expires_at')
        .eq('user_id', applicationUserId)
        .maybeSingle();
      existingLawyer = found;
    }

    // 套餐时长固定18个月
    const PACKAGE_MONTHS = 18;

    if (existingLawyer) {
      // 律师已存在，执行续费：叠加18个月
      let newExpiryDate = new Date();
      
      // 如果有有效到期时间，从到期时间开始计算；否则从现在开始
      if (existingLawyer.member_expires_at) {
        const currentExpiry = new Date(existingLawyer.member_expires_at);
        if (currentExpiry > new Date()) {
          // 会员未过期，从当前到期日开始计算
          newExpiryDate = calculateMemberExpiry(currentExpiry, PACKAGE_MONTHS);
        } else {
          // 会员已过期，从今天开始计算
          newExpiryDate = calculateMemberExpiry(new Date(), PACKAGE_MONTHS);
        }
      } else {
        // 无到期时间记录，从今天开始计算
        newExpiryDate = calculateMemberExpiry(new Date(), PACKAGE_MONTHS);
      }

      // 更新律师到期时间
      await supabase
        .from('lawyers')
        .update({ 
          member_expires_at: newExpiryDate.toISOString(),
          membership_status: 'normal'
        })
        .eq('id', existingLawyer.id);

      console.log('律师续费成功:', {
        userId: application.user_id,
        previousExpiry: existingLawyer.member_expires_at,
        newExpiry: newExpiryDate.toISOString(),
      });
    } else {
      // 新律师：创建账号，到期时间从今天开始计算18个月
      const expiresAt = calculateMemberExpiry(new Date(), PACKAGE_MONTHS);

      await supabase.from('lawyers').insert({
        user_id: applicationUserId,
        name: application.name,
        real_name: application.name,           // 🔧 从申请中带入
        phone: application.phone,
        wechat: application.wechat,
        license_no: application.license_number, // 🔧 从申请中带入
        specialization: application.specialties, // 🔧 从申请中带入
        is_active: true,
        is_available: true,
        member_expires_at: expiresAt.toISOString(),
        membership_status: 'normal',
        rating: 5.0,                           // 🔧 初始评分
        max_orders: 50,                        // 🔧 初始接单上限
        created_at: new Date().toISOString(),
      });

      console.log('律师账号创建成功:', {
        userId: application.user_id,
        name: application.name,
        expiresAt: expiresAt.toISOString(),
      });
    }

    console.log('律师入驻支付处理成功:', {
      applicationId: application.id,
      transactionId,
      outTradeNo,
    });

    // 返回成功响应
    return NextResponse.json(
      { code: 'SUCCESS', message: 'OK' },
      { status: 200 }
    );
  } catch (error) {
    console.error('处理律师入驻支付回调失败:', error);
    return NextResponse.json(
      { code: 'FAIL', message: 'Internal error' },
      { status: 500 }
    );
  }
}

// 处理微信支付验证回调（GET 请求）
export async function GET() {
  return NextResponse.json(
    { code: 'SUCCESS', message: 'OK' },
    { status: 200 }
  );
}
