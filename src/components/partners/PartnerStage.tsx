"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatKop, useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import Reveal, { RevealGroup, RevealItem } from "@/components/Reveal";
import ChromeSheen from "@/components/partners/ChromeSheen";

type Stats = {
  clicks30: number;
  orders: number;
  accruedKop: number;
  payableKop: number;
  paidKop: number;
};

/** Пример расчёта — не статистика, а арифметика; сумма взята из каталога. */
const EXAMPLE_ORDER_RUB = 6400;

/**
 * Тёмная сцена на /partners.
 *
 * Раньше здесь стояли придуманные 1284 перехода и 214 700 ₽ — числа, которых
 * никогда не существовало. Теперь тут либо настоящие цифры вошедшего
 * партнёра, либо условия программы и честно подписанный расчёт.
 */
export default function PartnerStage() {
  const { lang, t } = useLang();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetch("/api/account/partner", { cache: "no-store" })
      .then(async (res) => {
        if (!alive || !res.ok) return;
        const data = (await res.json()) as { stats?: Stats };
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {
        /* не загрузилось — покажем условия, как гостю */
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const terms = (
    [
      ["rate", "partners.terms.rate.k", "partners.terms.rate.v"],
      ["what", "partners.terms.what.k", "partners.terms.what.v"],
      ["window", "partners.terms.window.k", "partners.terms.window.v"],
      ["hold", "partners.terms.hold.k", "partners.terms.hold.v"],
      ["payout", "partners.terms.payout.k", "partners.terms.payout.v"],
      ["who", "partners.terms.who.k", "partners.terms.who.v"],
      ["clicks", "partners.terms.clicks.k", "partners.terms.clicks.v"],
      ["self", "partners.terms.self.k", "partners.terms.self.v"],
    ] as const
  ).map(([id, k, v]) => ({ id, k: t(k), v: t(v) }));

  return (
    <section className="dark-stage grain relative py-24 md:py-36">
      <div className="measure gutter">
        {stats ? (
          /* Партнёр смотрит на свои настоящие числа */
          <>
            <Reveal>
              <h2 className="label">{t("partners.mine.title")}</h2>
            </Reveal>
            {/* Настоящие деньги показываем сразу, без счётчика: цифра,
                которая доезжает до правды за секунду, для витрины хороша,
                а для собственного вознаграждения — нет */}
            <RevealGroup className="mt-10 grid divide-steel border-t hairline md:mt-14 md:grid-cols-3 md:divide-x">
              {[
                {
                  label: t("account.partner.stats.clicks"),
                  value: String(stats.clicks30),
                },
                {
                  label: t("account.partner.stats.orders"),
                  value: String(stats.orders),
                },
                {
                  label: t("account.partner.stats.accrued"),
                  value: formatKop(lang, stats.accruedKop),
                },
              ].map((stat) => (
                <RevealItem
                  key={stat.label}
                  className="border-b hairline py-9 last:border-b-0 md:border-b-0 md:px-12 md:py-14 md:first:pl-0 md:last:pr-0"
                >
                  <p className="display text-4xl tabular-nums md:text-5xl">
                    {stat.value}
                  </p>
                  <p className="label label-muted mt-4">{stat.label}</p>
                </RevealItem>
              ))}
            </RevealGroup>
            <Reveal>
              <div className="mt-10 flex flex-col gap-y-3 border-t hairline pt-10 md:flex-row md:items-end md:justify-between md:gap-x-8">
                <Link
                  href="/account?tab=partner"
                  className="btn btn-ondark-outline"
                >
                  {t("partners.mine.cta")}
                </Link>
                <span className="display text-chrome text-5xl leading-none md:text-7xl">
                  25%
                </span>
              </div>
            </Reveal>
          </>
        ) : (
          /* Всем остальным — условия и расчёт, без единого выдуманного числа */
          <>
            <Reveal>
              <h2 className="label">{t("partners.terms.title")}</h2>
            </Reveal>
            <RevealGroup className="mt-10 border-t hairline md:mt-14">
              {terms.map((row) => (
                <RevealItem
                  key={row.id}
                  className="grid gap-x-8 gap-y-1 border-b hairline py-5 md:grid-cols-[280px_1fr] md:py-6"
                >
                  <span className="label label-muted">{row.k}</span>
                  <span className="text-[15px] leading-relaxed">{row.v}</span>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal>
              <div className="mt-14 flex flex-col gap-y-6 md:mt-20 md:flex-row md:items-end md:justify-between md:gap-x-12">
                <div>
                  <p className="label label-muted">{t("partners.calc.title")}</p>
                  <p className="mt-5 text-sm text-(--text-on-dark-muted)">
                    {t("partners.calc.order")}{" "}
                    {EXAMPLE_ORDER_RUB.toLocaleString("ru-RU").replace(
                      / /g,
                      " ",
                    )}{" "}
                    ₽ — {t("partners.calc.you").toLowerCase()}
                  </p>
                  <p className="display mt-3 text-5xl leading-none md:text-6xl">
                    <ChromeSheen>
                      {formatKop(lang, EXAMPLE_ORDER_RUB * 25)}
                    </ChromeSheen>
                  </p>
                  <p className="mt-5 max-w-sm text-xs leading-relaxed text-(--text-on-dark-muted)">
                    {t("partners.calc.note")}
                  </p>
                </div>
                <Link href="/partner-terms" className="link-quiet label">
                  {t("partners.rules")}
                </Link>
              </div>
            </Reveal>
          </>
        )}
      </div>
    </section>
  );
}
