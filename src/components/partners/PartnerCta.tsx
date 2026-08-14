"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

/**
 * Заявка партнёра подаётся из кабинета — имя и почта берутся из учётной
 * записи, там же видно статус и личную ссылку. Поэтому на витрине вместо
 * второй формы стоит приглашение войти.
 */
export default function PartnerCta() {
  const { t } = useLang();
  const { user } = useAuth();

  return (
    <div className="border hairline bg-porcelain px-6 py-10 md:px-14 md:py-14">
      <h2 className="label label-muted">{t("partners.form.title")}</h2>
      <p className="accent-serif mt-6 max-w-xl text-xl leading-snug md:text-2xl">
        {user ? t("partners.cta.lead.user") : t("partners.cta.lead.guest")}
      </p>
      <Link
        href={
          user ? "/account?tab=partner" : "/login?next=/account%3Ftab%3Dpartner"
        }
        className="btn btn-primary mt-8 w-full md:w-auto"
      >
        {user ? t("partners.cta.account") : t("partners.cta.login")}
      </Link>
    </div>
  );
}
