"use client";

import InfoPage from "@/components/InfoPage";
import { infoPages } from "@/lib/info";

export default function DeliveryPage() {
  return <InfoPage content={infoPages.delivery} />;
}
