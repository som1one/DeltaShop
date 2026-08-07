"use client";

import InfoPage from "@/components/InfoPage";
import { infoPages } from "@/lib/info";

export default function ReturnsPage() {
  return <InfoPage content={infoPages.returns} />;
}
