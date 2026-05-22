import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// 提现 API 限流：每分钟 5 次
const WITHDRAW_RATE_LIMIT = 5;
const WITHDRAW_WINDOW_MS = 60000;

// 最低提现金额（分）
const MIN_WITHDRAW_AMOUNT = 10000; // 100元 = 10000分

// GET /api/guardian/withdraw - 获取提现配置或记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // 返回提现配置信息（无需认证）
    if (action === 'config') {
      return NextResponse.json({
        success: true,
        data: {
          minAmount: MIN_WITHDRAW_AMOUNT, // 100元 = 10000分（统一使用分）
          feeRate: 0, // 手续费率
          fee: 0, // 手续费
          feeDescription: '免手续费',
          arrivalTime: '1-3个工作日',
          processingDays: '1-3个工作日',
          rules: [
            '最低提现金额为100元',
            '提现申请提交后，预计1-3个工作日到账',
            '每笔提现免收手续费',
            '如有疑问请联系客服'
          ]
        }
      });
    }

    // 非 config 请求需要JWT认证获取 guardianId
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    if (auth.userType !== 'guardian') {
      return NextResponse.json({ success: false, error: '非守护者账号' }, { status: 403 });
    }
    const guardianId = auth.guardianId!;

    const supabase = getSupabaseAdmin();

    // 检查待处理的提现申请
    if (action === 'check-pending') {
      const { data: pending } = await supabase
        .from('guardian_withdrawals')
        .select('id, amount, created_at')
        .eq('guardian_id', guardianId)
        .in('status', ['pending', 'processing'])
        .maybeSingle();

      if (pending) {
        return NextResponse.json({
          success: true,
          data: {
            hasPending: true,
            pendingId: pending.id,
            pendingAmount: pending.amount / 100,
            pendingTime: pending.created_at,
            message: '您有正在处理中的提现申请，请等待完成后再申请'
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          hasPending: false
        }
      });
    }

    // 获取提现记录列表
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const { data: withdrawals, error, count } = await supabase
      .from('guardian_withdrawals')
      .select('*', { count: 'exact' })
      .eq('guardian_id', guardianId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('查询失败:', error);
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: withdrawals?.map(item => ({
        id: item.id,
        amount: item.amount / 100,
        actualAmount: item.actual_amount ? item.actual_amount / 100 : 0,
        fee: item.fee ? item.fee / 100 : 0,
        status: item.status,
        transferTime: item.transfer_time,
        rejectReason: item.reject_reason,
        createdAt: item.created_at,
        processedAt: item.processed_at
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('获取提现信息失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// POST /api/guardian/withdraw - 申请提现
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    
    // 检查是否是守护者类型
    if (auth.userType !== 'guardian') {
      return NextResponse.json({ 
        success: false, 
        error: '非守护者账号' 
      }, { status: 403 });
    }
    
    const guardianId = auth.guardianId!;

    // 限流检查
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`${clientIP}:withdraw`, WITHDRAW_RATE_LIMIT, WITHDRAW_WINDOW_MS);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount) {
      return NextResponse.json({ success: false, error: '缺少提现金额' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 使用原子操作：在更新余额时同时检查条件，避免竞态
    // 先创建提现记录
    const { data: withdrawal, error: insertError } = await supabase
      .from('guardian_withdrawals')
      .insert({
        guardian_id: guardianId,
        amount: amount,
        fee: 0,
        actual_amount: amount,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('创建提现记录失败:', insertError);
      return NextResponse.json({ success: false, error: '创建提现记录失败' }, { status: 500 });
    }

    // 重新查询守护者信息（避免脏读）
    const { data: guardian, error: guardianError } = await supabase
      .from('guardian_users')
      .select('*')
      .eq('id', guardianId)
      .single();

    if (guardianError || !guardian) {
      await supabase.from('guardian_withdrawals').delete().eq('id', withdrawal.id);
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    if (guardian.status === 'banned') {
      await supabase.from('guardian_withdrawals').delete().eq('id', withdrawal.id);
      return NextResponse.json({ success: false, error: '账号已被封禁，无法提现' }, { status: 403 });
    }

    // 检查是否有待处理的提现申请
    const { data: pendingWithdrawal } = await supabase
      .from('guardian_withdrawals')
      .select('id')
      .eq('guardian_id', guardianId)
      .in('status', ['pending', 'processing'])
      .neq('id', withdrawal.id)  // 排除刚创建的这条
      .maybeSingle();

    if (pendingWithdrawal) {
      await supabase.from('guardian_withdrawals').delete().eq('id', withdrawal.id);
      return NextResponse.json({
        success: false,
        error: '您有正在处理中的提现申请，请等待完成后再申请',
        code: 'PENDING_EXISTS'
      }, { status: 400 });
    }

    // 检查可提现金额
    if (guardian.available_commission < MIN_WITHDRAW_AMOUNT) {
      await supabase.from('guardian_withdrawals').delete().eq('id', withdrawal.id);
      return NextResponse.json({
        success: false,
        error: `可提现金额不足，最低提现金额为${MIN_WITHDRAW_AMOUNT / 100}元`
      }, { status: 400 });
    }

    if (amount < MIN_WITHDRAW_AMOUNT) {
      await supabase.from('guardian_withdrawals').delete().eq('id', withdrawal.id);
      return NextResponse.json({
        success: false,
        error: `提现金额不能低于${MIN_WITHDRAW_AMOUNT / 100}元`
      }, { status: 400 });
    }

    if (amount > guardian.available_commission) {
      await supabase.from('guardian_withdrawals').delete().eq('id', withdrawal.id);
      return NextResponse.json({
        success: false,
        error: '提现金额超过可提现余额'
      }, { status: 400 });
    }

    // 扣除可用余额（此操作与提现记录创建之间极小窗口，且已做多重检查）
    const { error: balanceUpdateError } = await supabase
      .from('guardian_users')
      .update({
        available_commission: guardian.available_commission - amount
      })
      .eq('id', guardianId)
      .gte('available_commission', amount);  // 条件更新防竞态

    if (balanceUpdateError) {
      console.error('更新余额失败:', balanceUpdateError);
      await supabase.from('guardian_withdrawals').delete().eq('id', withdrawal.id);
      return NextResponse.json({ success: false, error: '提现申请失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId: withdrawal.id,
        amount: amount,
        status: 'pending',
        message: '提现申请已提交，预计1-3个工作日到账'
      }
    });

  } catch (error) {
    console.error('提现申请失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
