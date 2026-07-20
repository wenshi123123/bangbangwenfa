import { useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { getGuardianInviteRegistrationPath } from '@/lib/guardian/invite-contract';

interface PosterOptions {
  inviteCode: string;
  nickname?: string;
  width?: number;
  height?: number;
}

/**
 * 生成守护者分享海报 - Canvas 精准版
 * 画布尺寸：1080 × 1920（固定）
 * 二维码位置：X=610, Y=1135, Size=320×320
 */
export function usePosterGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const generatePoster = useCallback(async (options: PosterOptions) => {
    const { inviteCode } = options;
    
    setGenerating(true);
    
    try {
      // 固定画布尺寸 1080 × 1920
      const CANVAS_W = 1080;
      const CANVAS_H = 1920;
      
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = CANVAS_W;
      canvasRef.current.height = CANVAS_H;
      const ctx = canvasRef.current.getContext('2d')!;
      
      // ========== 精准定位参数（用户调试确认） ==========
      const QR_X = 610;     // 二维码左边缘
      const QR_Y = 1344;    // 二维码上边缘
      const QR_SIZE = 260;  // 二维码尺寸（正方形）
      
      // ========== 1. 加载背景图 ==========
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = reject;
        bgImg.src = '/guardian-poster-bg.png';
      });
      
      // 绘制背景图（1080×1920 固定尺寸）
      ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);
      
      // ========== 2. 绘制二维码（精准嵌入白色方框） ==========
      const inviteUrl = `${window.location.origin}${getGuardianInviteRegistrationPath(inviteCode)}`;
      const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
        width: QR_SIZE,
        margin: 0,
        color: {
          dark: '#3F3028',
          light: '#FFFFFF',
        },
      });
      
      const qrImg = new Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => {
          ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);
          resolve();
        };
        qrImg.src = qrDataUrl;
      });
      
      // ========== 3. 叠加邀请码（用户调试确认位置） ==========
      const CODE_X = 230;    // 邀请码左边缘
      const CODE_Y = 1660;   // 邀请码上边缘
      const CODE_W = 240;    // 邀请码宽度
      const CODE_H = 60;     // 邀请码高度
      
      ctx.fillStyle = '#E09010';
      roundRect(ctx, CODE_X, CODE_Y, CODE_W, CODE_H, 16);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold 20px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(inviteCode, CODE_X + CODE_W / 2, CODE_Y + CODE_H / 2);
      
      // ========== 完成 ==========
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setPosterUrl(dataUrl);
      
      return dataUrl;
    } catch (error) {
      console.error('生成海报失败:', error);
      throw error;
    } finally {
      setGenerating(false);
    }
  }, []);

  const downloadPoster = useCallback((filename?: string) => {
    if (!posterUrl) return;
    
    const link = document.createElement('a');
    link.download = filename || `法律守护者邀请海报_${Date.now()}.png`;
    link.href = posterUrl;
    link.click();
  }, [posterUrl]);

  return {
    canvasRef,
    posterUrl,
    generating,
    generatePoster,
    downloadPoster,
  };
}

// 辅助函数：绘制圆角矩形
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
