import { redirect } from 'next/navigation';
import { getLawyerUrl } from '@/lib/site';

export default function LawyerDashboardRedirect() {
  redirect(getLawyerUrl());
}
