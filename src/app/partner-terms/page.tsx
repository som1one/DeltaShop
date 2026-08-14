"use client";

import InfoPage from "@/components/InfoPage";
import { partnerTerms } from "@/lib/legal";

export default function PartnerTermsPage() {
  return <InfoPage content={partnerTerms} eyebrow="footer.legal" />;
}
