"use client";

import { useRouter } from 'next/navigation';
import { LawyerJoinWizard } from '@/components/lawyer/lawyer-join-wizard';
import { getLawyerJoinUrl } from '@/lib/site';

export default function LawyerJoinApplyPage() {
  const router = useRouter();

  return <LawyerJoinWizard onBack={() => router.push(getLawyerJoinUrl())} />;
}
