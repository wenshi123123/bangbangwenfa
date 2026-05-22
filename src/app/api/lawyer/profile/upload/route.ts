import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { v4 as uuidv4 } from 'uuid';

// 上传文件到 Supabase Storage
async function uploadToStorage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  file: File,
  folder: string
): Promise<{ url?: string; error?: Error }> {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${folder}/${uuidv4()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase
      .storage
      .from('uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: uploadError };
    }

    const { data: urlData } = supabase
      .storage
      .from('uploads')
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function POST(request: NextRequest) {
  // 认证检查
  const auth = authenticateRequest(request);
  if (!auth || !auth.success) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  try {
    const formData = await request.formData();
    const lawyerId = formData.get('lawyerId');
    const avatarFile = formData.get('avatar') as File | null;
    const wechatQrcode = formData.get('wechatQrcode') as File | null;

    if (!lawyerId) {
      return NextResponse.json({
        success: false,
        error: '缺少律师ID'
      }, { status: 400 });
    }

    // 权限校验：只能修改自己的信息
    const supabase = getSupabaseAdmin();
    const { data: lawyer } = await supabase
      .from('lawyers')
      .select('user_id')
      .eq('id', lawyerId)
      .single();

    if (!lawyer || lawyer.user_id.toString() !== auth.user!.id.toString()) {
      return NextResponse.json({
        success: false,
        error: '无权修改此律师信息'
      }, { status: 403 });
    }

    // 处理头像上传
    if (avatarFile) {
      const { url: avatarUrl, error: avatarError } = await uploadToStorage(
        supabase, avatarFile, `lawyer/${lawyerId}/avatar`
      );
      if (avatarError) {
        return NextResponse.json({ success: false, error: '头像上传失败: ' + avatarError.message }, { status: 500 });
      }
      // 更新律师头像字段
      if (avatarUrl) {
        await supabase.from('lawyers').update({ avatar_url: avatarUrl }).eq('id', lawyerId);
      }
    }

    // 处理微信二维码上传
    if (wechatQrcode) {
      const { url: qrcodeUrl, error: qrcodeError } = await uploadToStorage(
        supabase, wechatQrcode, `lawyer/${lawyerId}/qrcode`
      );
      if (qrcodeError) {
        return NextResponse.json({ success: false, error: '二维码上传失败: ' + qrcodeError.message }, { status: 500 });
      }
      if (qrcodeUrl) {
        await supabase.from('lawyers').update({ wechat_qrcode: qrcodeUrl }).eq('id', lawyerId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 });
  }
}
