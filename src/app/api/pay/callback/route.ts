import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import crypto from 'crypto';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';

function decryptResource(ciphertext: string, associatedData: string, nonce: string, apiV3Key: string): string {
  const key = Buffer.from(apiV3Key, 'utf8');
  const iv = Buffer.from(nonce, 'utf8');
  const authTag = Buffer.from(ciphertext.slice(-16), 'base64');
  const data = Buffer.from(ciphertext.slice(0, -16), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  let decrypted = decipher.update(data, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    const timestamp = request.headers.get('wechatpay-timestamp') || '';
    const nonce = request.headers.get('wechatpay-nonce') || '';
    const serial = request.headers.get('wechatpay-serial') || '';
    const signature = authorization.match(/signature="([^"]+)"/)?.[1] || '';

    const body = await request.text();
    console.log('收到微信支付回调:', { timestamp, nonce, serial: serial ? '***' : 'missing' });

    const callbackData = JSON.parse(body);
    const { event_type, resource } = callbackData;
    console.log('事件类型:', event_type);

    const apiV3Key = process.env.WEIXIN_APIV3_KEY || '';

    if (!signature || !serial) {
      console.error('支付回调缺少签名信息');
      return NextResponse.json({ code: 'FAIL', message: '缺少签名信息' }, { status: 401 });
    }

    try {
      // verifyWechatPaySignature(signature, timestamp, nonce, body, serialNo)
      const verifyResult = await verifyWechatPaySignature(signature, timestamp, nonce, body, serial);
      if (!verifyResult.valid) {
        console.error('支付回调签名验证失败:', verifyResult.reason);
        return NextResponse.json({ code: 'FAIL', message: '签名验证失败' }, { status: 401 });
      }
      console.log('签名验证通过');
    } catch (verifyError) {
      console.error('签名验证出错:', verifyError);
      return NextResponse.json({ code: 'FAIL', message: '签名验证失败' }, { status: 401 });
    }

    if (event_type === 'TRANSACTION.SUCCESS') {
      let transactionData: any = null;
      if (resource && resource.ciphertext) {
        if (!apiV3Key) {
          console.error('未配置APIv3密钥，无法解密回调数据');
          return NextResponse.json({ code: 'FAIL', message: '配置错误' }, { status: 500 });
        }
        try {
          const decryptedData = decryptResource(resource.ciphertext, resource.associated_data || '', resource.nonce || '', apiV3Key);
          transactionData = JSON.parse(decryptedData);
          console.log('支付数据解密成功, 交易状态:', transactionData?.trade_state);
        } catch (decryptError) {
          console.error('解密支付数据失败:', decryptError);
          return NextResponse.json({ code: 'FAIL', message: '解密失败' }, { status: 500 });
        }
      }
      if (transactionData) {
        const { out_trade_no, transaction_id, trade_state, amount } = transactionData;
        console.log('交易状态:', trade_state, '商户订单号:', out_trade_no, '微信订单号:', transaction_id);
        if (trade_state === 'SUCCESS') {
          const supabase = getSupabaseClient();
          const { data: orders, error: queryError } = await supabase.from('consult_orders').select('id, payment_status, pay_trade_no, amount').eq('pay_trade_no', out_trade_no).limit(1);
          if (!queryError && orders && orders.length > 0) {
            const order = orders[0];
            if (amount && amount.total !== order.amount) {
              console.error('金额不匹配:', { callback: amount.total, order: order.amount });
              return NextResponse.json({ code: 'FAIL', message: '金额不匹配' }, { status: 400 });
            }
            if (order.payment_status !== 'paid') {
              const { error: updateError } = await supabase.from('consult_orders').update({
                payment_status: 'paid', paid_at: new Date().toISOString(),
                wechat_transaction_id: transaction_id, updated_at: new Date().toISOString(),
              }).eq('id', order.id);
              if (updateError) { console.error('更新订单状态失败:', updateError); }
              else { console.log('订单支付状态更新成功:', order.id); await createGuardianCommission(order.id, transaction_id); }
            } else { console.log('订单已支付，跳过重复处理:', order.id); }
          } else { console.log('未找到对应订单:', out_trade_no); }
        }
      }
    }
    return NextResponse.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('处理微信支付回调失败:', error);
    return NextResponse.json({ code: 'FAIL', message: '处理失败' }, { status: 500 });
  }
}

async function createGuardianCommission(orderId: number, transactionId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: order } = await supabase.from('consult_orders').select('id, user_id, amount').eq('id', orderId).single();
    if (!order || !order.user_id) return;
    const { data: user } = await supabase.from('users').select('id, inviter_id').eq('id', order.user_id).single();
    if (!user || !user.inviter_id) return;
    const { data: guardian } = await supabase.from('guardian_users').select('id').eq('id', user.inviter_id).eq('status', 'active').single();
    if (!guardian) return;
    const COMMISSION_RATE = 0.01;
    const commissionAmount = Math.floor(order.amount * COMMISSION_RATE);
    await supabase.from('guardian_commissions').insert({
      guardian_id: guardian.id, order_id: orderId, commission_amount: commissionAmount,
      commission_rate: COMMISSION_RATE, status: 'pending', created_at: new Date().toISOString(),
    });
    console.log('守护者分成记录创建成功:', { guardian_id: guardian.id, amount: commissionAmount });
  } catch (error) { console.error('创建守护者分成记录失败:', error); }
}
