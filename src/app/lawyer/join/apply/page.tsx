"use client";

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { LawyerJoinWizard } from '@/components/lawyer/lawyer-join-wizard';
import { getLawyerJoinUrl } from '@/lib/site';

export default function LawyerJoinApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return <LawyerJoinWizard sourceApplicationId={searchParams.get('sourceApplicationId') || undefined} onBack={() => router.push(getLawyerJoinUrl())} />;
}
