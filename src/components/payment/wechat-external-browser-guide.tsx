"use client";

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WechatExternalBrowserGuideProps {
  className?: string;
}

export function WechatExternalBrowserGuide({ className }: WechatExternalBrowserGuideProps) {
  const [copied, setCopied] = useState(false);

  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className={cn('flex min-h-screen items-center justify-center bg-[#FAF7F2] px-5 py-10', className)} aria-live="polite">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-[0_12px_36px_rgba(61,50,45,0.12)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5EDE5]">
          <ExternalLink className="h-7 w-7 text-[#C47353]" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-xl font-semibold text-[#3D322D]">请在浏览器打开后继续支付</h1>
        <p className="mt-3 text-sm leading-7 text-[#6E5A4F]">
          请点击微信右上角“…” ，选择“在浏览器打开”，再继续完成支付。
        </p>
        <p className="mt-2 text-xs leading-5 text-[#8C7B6E]">为保障支付安全与订单信息完整，请在手机浏览器中完成支付。</p>
        <Button
          type="button"
          onClick={copyPaymentLink}
          className="mt-6 w-full bg-[#C47353] text-white hover:bg-[#A85D40]"
        >
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? '支付链接已复制' : '复制支付链接'}
        </Button>
      </div>
    </section>
  );
}
