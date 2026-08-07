"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import Reveal from "@/components/Reveal";

/** Shared empty-cart state for /cart and the /checkout guard. */
export default function EmptyCart() {
  const { t } = useLang();
  return (
    <Reveal className="flex min-h-[46vh] flex-col items-center justify-center text-center">
      <p className="display text-2xl tracking-[0.1em] md:text-3xl">
        {t("cart.empty")}
      </p>
      <p className="mt-3 text-sm text-muted">{t("cart.empty.note")}</p>
      <Link href="/visual" className="btn btn-onlight-outline mt-8">
        {t("cart.empty.cta")}
      </Link>
    </Reveal>
  );
}
