'use client';

/* The QR value is generated as a data URL, which should not be passed through Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import { Check, Copy, Download, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

type ShareAction = 'link' | 'qr' | 'poster' | null;

export function GuardianShareDrawer({ open, onOpenChange, inviteCode, qrCodeUrl, completedAction, onCopyLink, onDownloadQrCode, onGeneratePoster }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteCode: string;
  qrCodeUrl: string;
  completedAction: ShareAction;
  onCopyLink: () => void;
  onDownloadQrCode: () => void;
  onGeneratePoster: () => void;
}) {
  const completeLabel = completedAction === 'link' ? '链接已复制' : completedAction === 'qr' ? '二维码已保存' : completedAction === 'poster' ? '正在生成海报' : '';

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom" shouldScaleBackground={false}>
      <DrawerContent overlayClassName="bg-black/35" className="max-h-[84vh] rounded-t-[1.75rem] border-0 bg-[#FAF7F2]">
        <DrawerHeader className="px-5 pb-3 pt-5 text-left">
          <DrawerTitle className="font-serif text-xl font-semibold text-[#3F3028]">邀请亲友获得法律帮助</DrawerTitle>
          <DrawerDescription className="mt-2 leading-6 text-[#7A5E4F]">亲友将通过平台完成注册和法律咨询，个人信息与咨询内容受保护。</DrawerDescription>
        </DrawerHeader>
        <div className="safe-bottom space-y-3 overflow-y-auto px-5 pb-5">
          <div className="flex items-center gap-3 rounded-xl border border-[#E9D2C0] bg-white px-4 py-3">
            {qrCodeUrl ? <img src={qrCodeUrl} alt="专属邀请二维码" className="h-14 w-14 rounded-lg border border-[#F2E2D2]" /> : <div className="h-14 w-14 rounded-lg bg-[#F2E2D2]" />}
            <div><p className="text-xs text-[#8C6C59]">守护凭证</p><p className="mt-0.5 font-mono text-lg font-semibold tracking-[0.12em] text-[#3F3028]">{inviteCode}</p></div>
          </div>
          <button type="button" onClick={onGeneratePoster} className="flex min-h-11 w-full items-center justify-between rounded-xl bg-[#C47353] px-4 py-4 text-left text-white transition-[transform,background-color] duration-150 active:scale-[0.98] active:bg-[#A95E42]"><span className="flex items-center gap-3"><ImageIcon aria-hidden="true" className="h-5 w-5" /><span><span className="block font-semibold">分享守护海报</span><span className="mt-0.5 block text-xs text-white/80">适合发送给亲友或分享至社群</span></span></span></button>
          <button type="button" onClick={onDownloadQrCode} disabled={!qrCodeUrl} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[#DFC0AC] bg-white px-4 py-4 text-left text-[#3F3028] transition-[transform,background-color] duration-150 active:scale-[0.98] active:bg-[#F7EEE7] disabled:opacity-50"><span className="flex items-center gap-3"><Download aria-hidden="true" className="h-5 w-5 text-[#A96820]" /><span><span className="block font-semibold">保存专属二维码</span><span className="mt-0.5 block text-xs text-[#8C6C59]">适合线下和一对一分享</span></span></span></button>
          <button type="button" onClick={onCopyLink} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[#DFC0AC] bg-white px-4 py-4 text-left text-[#3F3028] transition-[transform,background-color] duration-150 active:scale-[0.98] active:bg-[#F7EEE7]"><span className="flex items-center gap-3"><Copy aria-hidden="true" className="h-5 w-5 text-[#A96820]" /><span><span className="block font-semibold">复制邀请链接</span><span className="mt-0.5 block text-xs text-[#8C6C59]">适合文字聊天和公众号发布</span></span></span></button>
          <p aria-live="polite" className="min-h-5 text-center text-sm text-[#3F6A5A]">{completeLabel && <><Check aria-hidden="true" className="mr-1 inline h-4 w-4" />{completeLabel}</>}</p>
          <div className="flex items-start gap-2 rounded-xl bg-[#F2E2D2]/70 px-3 py-3 text-xs leading-5 text-[#7A5E4F]"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#3F6A5A]" />平台会保护亲友的个人信息与咨询隐私。</div>
          <DrawerClose className="min-h-11 w-full rounded-xl py-3 text-sm font-medium text-[#7A5E4F] transition-colors duration-150 active:bg-[#F2E2D2]">暂不邀请</DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
