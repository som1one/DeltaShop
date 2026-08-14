"use client";

import { useLang } from "@/lib/i18n";
import Reveal, { RevealGroup, RevealItem } from "@/components/Reveal";
import PartnerCta from "@/components/partners/PartnerCta";
import PartnerStage from "@/components/partners/PartnerStage";
import ChromeSheen from "@/components/partners/ChromeSheen";

export default function PartnersPage() {
  const { t } = useLang();

  const steps = [
    {
      n: "01",
      title: t("partners.step1.title"),
      text: t("partners.step1.text"),
    },
    {
      n: "02",
      title: t("partners.step2.title"),
      text: t("partners.step2.text"),
    },
    {
      n: "03",
      title: t("partners.step3.title"),
      text: t("partners.step3.text"),
    },
  ];

  return (
    <div>
      {/* Hero — the chrome 25% is the page's one loud moment */}
      <section className="measure gutter pt-28 md:pt-40">
        <Reveal>
          <p className="label label-muted">{t("partners.label")}</p>
          <h1 className="display mt-6 max-w-4xl break-words text-[clamp(2rem,9vw,4.5rem)] md:text-7xl">
            {t("partners.title")}
          </h1>
          <p className="accent-serif mt-8 max-w-2xl text-xl leading-relaxed text-muted md:text-2xl">
            {t("partners.lead")}
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          {/* Decorative flourish — the figure itself is stated in the lead.
              Desktop-only: at phone widths the washed-chrome giant floats
              in a void instead of reading as a poster element */}
          <div
            aria-hidden="true"
            className="mt-14 hidden justify-end border-b hairline pb-8 md:mt-20 md:flex md:pb-12"
          >
            <p className="display text-[clamp(5.5rem,22vw,15rem)] leading-[0.95]">
              <ChromeSheen>25%</ChromeSheen>
            </p>
          </div>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="measure gutter pt-20 pb-24 md:pt-28 md:pb-36">
        <Reveal>
          <h2 className="label label-muted">{t("partners.how")}</h2>
        </Reveal>
        <RevealGroup className="mt-10 grid divide-linen border-t hairline md:mt-12 md:grid-cols-3 md:divide-x">
          {steps.map((step) => (
            <RevealItem
              key={step.n}
              className="border-b hairline py-10 last:border-b-0 md:border-b-0 md:px-12 md:py-14 md:first:pl-0 md:last:pr-0"
            >
              <span className="label label-muted">{step.n}</span>
              <h3 className="display mt-5 text-2xl">{step.title}</h3>
              <p className="mt-4 max-w-xs text-sm text-muted">{step.text}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Заявка — из кабинета */}
      <section className="measure gutter pb-24 md:pb-36">
        <Reveal className="mx-auto max-w-3xl">
          <PartnerCta />
        </Reveal>
      </section>

      {/* Условия и расчёт — или настоящие числа вошедшего партнёра */}
      <PartnerStage />
    </div>
  );
}
