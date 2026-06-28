import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

export async function GET(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;
    
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('guardian_withdrawals')
      .select('*, guardian_id, amount, status, wechat_qrcode, admin_note, created_at, processed_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) query = query.eq('status', status);
    
    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const withdrawals = data || [];
    const guardianIds = [...new Set(withdrawals.map((item) => item.guardian_id).filter(Boolean))];

    let guardianMap = new Map<string, { id: string; nickname: string; wechat_account: string | null; user_id: number | null }>();
    if (guardianIds.length > 0) {
      const { data: guardians } = await supabase
        .from('guardian_users')
        .select('id, nickname, wechat_account, user_id')
        .in('id', guardianIds);

      guardianMap = new Map(
        (guardians || []).map((guardian) => [String(guardian.id), guardian])
      );
    }

    const result = withdrawals.map((item) => ({
      ...item,
      guardian: guardianMap.get(String(item.guardian_id)) || null,
    }));

    return NextResponse.json({ success: true, data: result, total: count || 0, page, limit });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const body = await request.json();
    const { id, status, adminNote } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // 发送通知辅助函数
    async function sendNotification(userId: string, type: string, data: any) {
      try {
        const templates: Record<string, { title: string; content: string }> = {
          withdrawal_completed: {
            title: '提现已到账',
            content: `¥${(data.amount / 100).toFixed(2)} 已到账，请查收`
          },
          withdrawal_rejected: {
            title: '提现被拒绝',
            content: `提现申请被拒绝，原因：${data.reason || '请联系客服'}`
          },
        };
        const template = templates[type];
        if (template) {
          await supabase.from('notifications').insert({
            user_id: userId,
            type,
            title: template.title,
            content: template.content,
            related_id: id,
            is_read: false,
          });
        }
      } catch (e) {
        console.error('发送通知失败:', e);
      }
    }
    
    // 先查询提现记录
    const { data: withdrawal, error: fetchError } = await supabase
      .from('guardian_withdrawals')
      .select('id, guardian_id, amount, status, wechat_qrcode, admin_note, created_at, processed_at')
      .eq('id', id)
      .single();
    
    if (fetchError || !withdrawal) {
      return NextResponse.json({ success: false, error: '提现记录不存在' }, { status: 404 });
    }

    const { data: guardian, error: guardianError } = await supabase
      .from('guardian_users')
      .select('id, nickname, available_commission, withdrawn_commission, user_id')
      .eq('id', withdrawal.guardian_id)
      .single();

    if (guardianError || !guardian) {
      return NextResponse.json({ success: false, error: '守护者信息不存在' }, { status: 404 });
    }
    
    // 审核通过时扣除余额
    if (status === 'completed' && withdrawal.status !== 'completed') {
      if (guardian.available_commission < withdrawal.amount) {
        return NextResponse.json({ success: false, error: '用户余额不足，无法完成提现' }, { status: 400 });
      }
      
      // 扣除余额并更新已提现总额
      const { error: updateBalanceError } = await supabase
        .from('guardian_users')
        .update({
          available_commission: guardian.available_commission - withdrawal.amount,
          withdrawn_commission: guardian.withdrawn_commission + withdrawal.amount
        })
        .eq('id', guardian.id);
      
      if (updateBalanceError) {
        return NextResponse.json({ success: false, error: '更新余额失败' }, { status: 500 });
      }
      
      // 发送通知：提现完成
      if (guardian.user_id) {
        await sendNotification(guardian.user_id, 'withdrawal_completed', {
          amount: withdrawal.amount,
        });
      }
    } else if (status === 'rejected' && withdrawal.status !== 'rejected') {
      // 发送通知：提现被拒绝
      if (guardian.user_id) {
        await sendNotification(guardian.user_id, 'withdrawal_rejected', {
          reason: adminNote || '请联系客服',
        });
      }
    }
    
    // 更新提现记录状态
    const updates: Record<string, unknown> = { 
      status,
      processed_at: new Date().toISOString()
    };
    if (adminNote) updates.admin_note = adminNote;
    
    const { data, error } = await supabase
      .from('guardian_withdrawals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('审核提现失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
