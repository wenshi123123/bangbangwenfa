"use client";

import { LawyerPromoSection } from '@/components/lawyer/lawyer-promo-section';
import { getLawyerJoinApplyUrl } from '@/lib/site';

export default function LawyerJoinIntroPage() {
  return <LawyerPromoSection applyHref={getLawyerJoinApplyUrl()} />;
}
