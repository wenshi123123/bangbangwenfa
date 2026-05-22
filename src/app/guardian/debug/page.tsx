import { redirect } from 'next/navigation';

/**
 * 调试页面 - 生产环境已禁用
 * 访问时重定向到首页
 */
export default function DebugPage() {
  redirect('/');
}
