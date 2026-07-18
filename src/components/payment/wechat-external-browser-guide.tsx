"use client";

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <section className={className} aria-live="polite">
      <div className="flex items-start gap-3 rounded-xl border border-[rgba(196,115,83,0.28)] bg-[#F5EDE5] p-4 text-left">
        <ExternalLink className="mt-0.5 h-5 w-5 flex-none text-[#C47353]" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="font-serif text-base font-semibold text-[#3D322D]">请在浏览器打开后继续支付</h3>
          <p className="mt-1 text-sm leading-6 text-[#6E5A4F]">
            当前微信内支付暂不可用。请复制支付链接，点击微信右上角“…”并选择在浏览器打开，再继续完成支付。
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={copyPaymentLink}
        className="mt-3 w-full bg-[#C47353] text-white hover:bg-[#A85D40]"
      >
        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
        {copied ? '支付链接已复制' : '复制支付链接'}
      </Button>
    </section>
  );
}
