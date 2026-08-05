import Link from 'next/link';
import { notFound } from 'next/navigation';

const pages = [
  ['守护者中心样稿', '/local-preview/guardian', '邀请、收益、提现区域的字体与布局预览'],
  ['律师工作台样稿', '/local-preview/lawyer', '订单、状态、资料区域的字体与布局预览'],
  ['管理后台样稿', '/local-preview/admin', '审核列表、统计卡片与按钮的字体与布局预览'],
];

export default function LocalPreviewIndex() {
  if (process.env.NODE_ENV === 'production' || process.env.DEPLOY_ENV === 'PROD') notFound();
  return <section className="mx-auto max-w-3xl px-5 py-12"><p className="text-sm font-semibold text-amber-700">仅本机测试，不会影响线上</p><h1 className="mt-2 text-3xl font-bold">页面样稿目录</h1><p className="mt-3 text-muted-foreground">选择一个页面进行字体、大小、颜色、间距和手机端样式预览。</p><div className="mt-8 grid gap-4">{pages.map(([title, href, description]) => <Link key={href} href={href} className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-amber-500"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></Link>)}</div></section>;
}
