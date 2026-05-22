import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

const COOLDOWN_DAYS = 7;

// POST /api/guardian/bind-qrcode - 上传微信收款码文件（支持7天冷却）
export async function POST(request: NextRequest) {
  try {
    // 验证JWT
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }

    const formData = await request.formData();
    const qrcodeFile = formData.get('qrcode') as File | null;
    const wechatAccount = formData.get('wechatAccount') as string | null;
    const guardianIdRaw = formData.get('guardianId') as string | null;

    // 确定守护者ID
    const guardianId = guardianIdRaw || auth.guardianId?.toString();
    if (!guardianId) {
      return NextResponse.json({ success: false, error: '无法确定守护者身份' }, { status: 400 });
    }

    if (!qrcodeFile && !wechatAccount) {
      return NextResponse.json({ success: false, error: '请上传收款码或填写微信号' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 查询当前守护者记录（检查冷却期）
    const { data: current, error: fetchError } = await supabase
      .from('guardian_users')
      .select('wechat_qrcode, wechat_qrcode_updated_at')
      .eq('id', guardianId)
      .single();

    if (fetchError) {
      console.error('查询守护者信息失败:', fetchError);
      return NextResponse.json({ success: false, error: '查询失败，请重试' }, { status: 500 });
    }

    // 7天冷却检查
    if (current?.wechat_qrcode && current?.wechat_qrcode_updated_at) {
      const lastUpdate = new Date(current.wechat_qrcode_updated_at);
      const now = new Date();
      const daysSince = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince < COOLDOWN_DAYS) {
        const remainingSeconds = Math.ceil((COOLDOWN_DAYS - daysSince) * 24 * 60 * 60);
        return NextResponse.json({
          success: false,
          error: `更换收款码需等待 ${COOLDOWN_DAYS} 天冷却期`,
          remainingSeconds,
          lastUpdated: current.wechat_qrcode_updated_at,
        }, { status: 429 });
      }
    }

    const updates: Record<string, any> = {
      wechat_qrcode_updated_at: new Date().toISOString(),
    };

    // 处理收款码文件上传
    if (qrcodeFile && qrcodeFile.size > 0) {
      const fileExt = qrcodeFile.name.split('.').pop();
      const fileName = `guardian_qrcode_${guardianId}_${Date.now()}.${fileExt}`;
      const filePath = `guardians/${guardianId}/${fileName}`;

      const buffer = Buffer.from(await qrcodeFile.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from('guardian-files')
        .upload(filePath, buffer, {
          contentType: qrcodeFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error('收款码上传失败:', uploadError);
        return NextResponse.json({ success: false, error: '收款码上传失败' }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from('guardian-files')
        .getPublicUrl(filePath);

      updates.wechat_qrcode = urlData.publicUrl;
    }

    // 微信账号
    if (wechatAccount) {
      updates.wechat_account = wechatAccount;
    }

    // 更新守护者信息
    const { error: updateError } = await supabase
      .from('guardian_users')
      .update(updates)
      .eq('id', guardianId);

    if (updateError) {
      console.error('更新失败:', updateError);
      if (updateError.message?.includes('wechat_qrcode')) {
        return NextResponse.json({
          success: false,
          error: '数据库缺少字段，请联系管理员执行迁移SQL',
          hint: 'ALTER TABLE guardian_users ADD COLUMN IF NOT EXISTS wechat_qrcode TEXT; ALTER TABLE guardian_users ADD COLUMN IF NOT EXISTS wechat_qrcode_updated_at TIMESTAMP WITH TIME ZONE;',
        }, { status: 500 });
      }
      return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: current?.wechat_qrcode ? '收款码更换成功' : '收款码绑定成功',
      data: {
        wechatQrcode: updates.wechat_qrcode,
        wechatAccount: updates.wechat_account,
      },
    });
  } catch (error) {
    console.error('处理请求失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
