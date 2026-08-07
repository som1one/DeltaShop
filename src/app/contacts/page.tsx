"use client";

import InfoPage from "@/components/InfoPage";
import { infoPages } from "@/lib/info";

export default function ContactsPage() {
  return <InfoPage content={infoPages.contacts} />;
}
