"use client";

import InfoPage from "@/components/InfoPage";
import { privacyPolicy } from "@/lib/legal";

export default function PrivacyPage() {
  return <InfoPage content={privacyPolicy} eyebrow="footer.legal" />;
}
