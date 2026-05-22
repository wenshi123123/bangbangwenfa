import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import crypto from 'crypto';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';

/**
 * 解密微信支付回调的敏感数据（AES-256-GCM）
 */
function decryptResource(
  ciphertext: string,
  associatedData: string,
  nonce: string,
  apiV3Key: string
): string {
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

/**
 * 微信支付回调通知（APIv3 版本）
 * POST /api/pay/callback
 * 
 * 微信支付APIv3发送JSON格式回调，使用Authorization头验证签名
 */
export async function POST(request: NextRequest) {
  try {
    // 获取签名信息
    const authorization = request.headers.get('authorization') || '';
    const timestamp = request.headers.get('wechatpay-timestamp') || '';
    const nonce = request.headers.get('wechatpay-nonce') || '';
    const serial = request.headers.get('wechatpay-serial') || '';
    const signature = authorization.match(/signature="([^"]+)"/)?.[1] || '';

    const body = await request.text();
    console.log('收到微信支付回调:', { timestamp, nonce, serial: serial ? '***' : 'missing' });

    // 解析回调数据
    const callbackData = JSON.parse(body);
    const { event_type, resource } = callbackData;

    console.log('事件类型:', event_type);

    // 验证签名（使用自动获取的平台证书）
    const apiV3Key = process.env.WEIXIN_APIV3_KEY || '';

    // 签名验证：任何环境都必须验证
    if (!signature || !serial) {
      console.error('支付回调缺少签名信息');
      return NextResponse.json(
        { code: 'FAIL', message: '缺少签名信息' },
        { status: 401 }
      );
    }

    try {
      const verifyResult = await verifyWechatPaySignature(
        timestamp,
        nonce,
        body,
        signature,
        serial
      );
      if (!verifyResult.valid) {
        console.error('支付回调签名验证失败:', verifyResult.reason);
        return NextResponse.json(
          { code: 'FAIL', message: '签名验证失败' },
          { status: 401 }
        );
      }
      console.log('签名验证通过');
    } catch (verifyError) {
      console.error('签名验证出错:', verifyError);
      return NextResponse.json(
        { code: 'FAIL', message: '签名验证失败' },
        { status: 401 }
      );
    }

    // 处理支付成功事件
    if (event_type === 'TRANSACTION.SUCCESS') {
      // 解密支付结果
      let transactionData: any = null;

      if (resource && resource.ciphertext) {
        if (!apiV3Key) {
          console.error('未配置APIv3密钥，无法解密回调数据');
          return NextResponse.json(
            { code: 'FAIL', message: '配置错误' },
            { status: 500 }
          );
        }

        try {
          const decryptedData = decryptResource(
            resource.ciphertext,
            resource.associated_data || '',
            resource.nonce || '',
            apiV3Key
          );
          transactionData = JSON.parse(decryptedData);
          console.log('支付数据解密成功, 交易状态:', transactionData?.trade_state);
        } catch (decryptError) {
          console.error('解密支付数据失败:', decryptError);
          return NextResponse.json(
            { code: 'FAIL', message: '解密失败' },
            { status: 500 }
          );
        }
      }

      if (transactionData) {
        const {
          out_trade_no,
          transaction_id,
          trade_state,
          amount
        } = transactionData;

        console.log('交易状态:', trade_state, '商户订单号:', out_trade_no, '微信订单号:', transaction_id);

        if (trade_state === 'SUCCESS') {
          const supabase = getSupabaseClient();

          // 查询订单
          const { data: orders, error: queryError } = await supabase
            .from('consult_orders')
            .select('id, payment_status, pay_trade_no, amount')
            .eq('pay_trade_no', out_trade_no)
            .limit(1);

          if (!queryError && orders && orders.length > 0) {
            const order = orders[0];

            // 验证金额（防止篡改）
            if (amount && amount.total !== order.amount) {
              console.error('金额不匹配:', { callback: amount.total, order: order.amount });
              return NextResponse.json(
                { code: 'FAIL', message: '金额不匹配' },
                { status: 400 }
              );
            }

            if (order.payment_status !== 'paid') {
              // 更新为已支付
              const { error: updateError } = await supabase
                .from('consult_orders')
                .update({
                  payment_status: 'paid',
                  paid_at: new Date().toISOString(),
                  wechat_transaction_id: transaction_id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', order.id);

              if (updateError) {
                console.error('更新订单状态失败:', updateError);
              } else {
                console.log('订单支付状态更新成功:', order.id);

                // 创建守护者分成记录
                await createGuardianCommission(order.id, transaction_id);
              }
            } else {
              console.log('订单已支付，跳过重复处理:', order.id);
            }
          } else {
            console.log('未找到对应订单:', out_trade_no);
          }
        }
      }
    }

    // 返回成功响应
    return NextResponse.json({ code: 'SUCCESS', message: '成功' });

  } catch (error) {
    console.error('处理微信支付回调失败:', error);
    return NextResponse.json(
      { code: 'FAIL', message: '处理失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建守护者分成记录
 */
async function createGuardianCommission(orderId: number, transactionId: string) {
  try {
    const supabase = getSupabaseClient();

    // 查询订单的邀请关系
    const { data: order } = await supabase
      .from('consult_orders')
      .select('id, user_id, amount')
      .eq('id', orderId)
      .single();

    if (!order || !order.user_id) return;

    // 查询用户的邀请人（守护者）
    // users 表使用 inviter_id 字段存储邀请人（guardian_users.id）
    const { data: user } = await supabase
      .from('users')
      .select('id, inviter_id')
      .eq('id', order.user_id)
      .single();

    if (!user || !user.inviter_id) return;

    // 查询守护者信息（inviter_id 即为 guardian_users 表的主键 id）
    const { data: guardian } = await supabase
      .from('guardian_users')
      .select('id, commission_rate')
      .eq('id', user.inviter_id)
      .eq('status', 'active')
      .single();

    if (!guardian) return;

    // 计算分成金额（假设分成比例为10%）
    const commissionRate = guardian.commission_rate || 0.1;
    const commissionAmount = Math.floor(order.amount * commissionRate);

    // 创建分成记录
    await supabase
      .from('guardian_commissions')
      .insert({
        guardian_id: guardian.id,
        order_id: orderId,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    console.log('守护者分成记录创建成功:', { guardian_id: guardian.id, amount: commissionAmount });

  } catch (error) {
    console.error('创建守护者分成记录失败:', error);
  }
}
