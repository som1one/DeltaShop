"use client";

import InfoPage from "@/components/InfoPage";
import { publicOffer } from "@/lib/legal";

export default function OfferPage() {
  return <InfoPage content={publicOffer} eyebrow="footer.legal" />;
}
