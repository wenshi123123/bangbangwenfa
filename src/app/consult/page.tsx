import { Suspense } from 'react';
import { ConsultationWizard } from '@/components/consult/consultation-wizard';
import { Spinner } from '@/components/ui/spinner';

export default function ConsultPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Spinner /></div>}>
      <ConsultationWizard />
    </Suspense>
  );
}
