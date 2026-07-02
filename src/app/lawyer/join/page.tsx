'use client';

import { useRouter } from 'next/navigation';
import { LawyerJoinWizard } from '@/components/lawyer/lawyer-join-wizard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LawyerJoinPage() {
  const router = useRouter();
  
  return (
    <LawyerJoinWizard
      onBack={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
          return;
        }
        router.push('/');
      }}
    />
  );
}
