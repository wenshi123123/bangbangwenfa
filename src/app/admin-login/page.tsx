import { redirect } from 'next/navigation';
import { getAdminLoginUrl } from '@/lib/site';

export default function AdminLoginAliasPage() {
  redirect(getAdminLoginUrl());
}
