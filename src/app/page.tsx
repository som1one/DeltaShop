"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { leadSpan } from "@/lib/products";
import { useProducts } from "@/lib/products-context";
import ProductCard from "@/components/ProductCard";
import Reveal, { RevealGroup, RevealItem } from "@/components/Reveal";
import HeroProductCard from "@/components/catalog/HeroProductCard";
import HeroDiptych from "@/components/home/HeroDiptych";
import HeroTypographic from "@/components/home/HeroTypographic";
import ParallaxFrame from "@/components/home/ParallaxFrame";

export default function Home() {
  const { lang, t } = useLang();
  const { get, featured } = useProducts();
  /* Both bands lean on a specific piece; a catalogue edited from the admin
     can drop either, so the section simply stands down when it is gone. */
  const serum = get("forma-serum");
  const cap = get("cap-drape");
  const [lead, ...rest] = featured();
  const span = leadSpan(rest.length);

  /* The "25%" moment: lift the number out of the title so it can go huge */
  const partnersTitle = t("home.partners.title");
  const partnersMatch = partnersTitle.match(/^(\d+\s?%)\s*(.*)$/);

  return (
    <div>
      {/* 1 — Hero: typographic monument on mobile, split diptych from md up */}
      <div className="md:hidden">
        <HeroTypographic />
      </div>
      <div className="hidden md:block">
        <HeroDiptych />
      </div>

      {/* 2 — Manifesto */}
      <section className="gutter py-24 md:py-36">
        <Reveal className="measure">
          <p className="accent-serif mx-auto max-w-3xl text-center text-2xl leading-[1.45] md:text-4xl md:leading-[1.35]">
            {t("home.manifesto")}
          </p>
        </Reveal>
      </section>

      {/* 3 — Featured */}
      <section className="gutter pb-24 md:pb-36">
        <div className="measure">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div>
                <p className="label label-muted">{t("home.featured.label")}</p>
                <h2 className="display mt-3 text-3xl md:text-4xl">
                  {t("home.featured.title")}
                </h2>
              </div>
              <Link href="/visual" className="label link-quiet">
                {t("home.featured.all")} →
              </Link>
            </div>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
            {lead ? (
              <RevealItem
                key={lead.id}
                className={`${span.sm ? "sm:col-span-2" : ""} ${
                  span.lg ? "lg:col-span-2" : "lg:col-span-1"
                }`}
              >
                <HeroProductCard product={lead} wide={span.lg} />
              </RevealItem>
            ) : null}
            {rest.map((p) => (
              <RevealItem key={p.id}>
                <ProductCard product={p} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* 4 — FORMA band */}
      <section className="dark-stage grain relative">
        <div
          className={`measure gutter grid items-center gap-14 py-24 md:gap-24 md:py-36 ${
            serum ? "md:grid-cols-2" : ""
          }`}
        >
          {serum && (
            <Reveal>
              {/* Studio cutout on porcelain — a light frame inside the dark
                  band, mirroring how the VISUAL band carries the cap */}
              <ParallaxFrame
                className="border hairline bg-porcelain"
                layerClassName="bg-porcelain"
              >
                <Image
                  src={serum.image}
                  alt={serum.name[lang]}
                  fill
                  sizes="(max-width: 767px) 92vw, 44vw"
                  className="object-contain p-[9%] mix-blend-multiply"
                />
              </ParallaxFrame>
            </Reveal>
          )}
          <Reveal delay={0.12}>
            <p className="label label-muted">{t("home.forma.label")}</p>
            <h2 className="display mt-5 text-3xl md:text-5xl">
              {t("home.forma.title")}
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ondark-muted">
              {t("home.forma.text")}
            </p>
            <div className="mt-10">
              <Link href="/forma" className="btn btn-ondark">
                {t("home.forma.cta")} →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5 — Thin utility strip: delivery, returns, payment */}
      <section className="gutter border-b hairline py-2.5 md:py-5">
        <Reveal className="measure">
          <p className="label label-muted text-center leading-relaxed">
            {t("home.note")}
          </p>
        </Reveal>
      </section>

      {/* 6 — VISUAL band, mirrored */}
      <section>
        <div
          className={`measure gutter grid items-center gap-14 py-24 md:gap-24 md:py-36 ${
            cap ? "md:grid-cols-2" : ""
          }`}
        >
          {cap && (
            <Reveal className="md:order-2">
              <ParallaxFrame
                className="border hairline bg-porcelain"
                layerClassName="bg-porcelain"
              >
                <Image
                  src={cap.image}
                  alt={cap.name[lang]}
                  fill
                  sizes="(max-width: 767px) 92vw, 44vw"
                  className="object-contain p-[9%] mix-blend-multiply"
                />
              </ParallaxFrame>
            </Reveal>
          )}
          <Reveal delay={0.12} className="md:order-1">
            <p className="label label-muted">{t("home.visual.label")}</p>
            <h2 className="display mt-5 text-3xl md:text-5xl">
              {t("home.visual.title")}
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
              {t("home.visual.text")}
            </p>
            <div className="mt-10">
              <Link href="/visual" className="btn btn-primary">
                {t("home.visual.cta")} →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7 — Partners band */}
      <section
        className="dark-stage grain relative"
        style={{ backgroundColor: "var(--oxblood)" }}
      >
        <div className="measure gutter flex flex-col items-center py-24 text-center md:py-36">
          <Reveal>
            <p className="label text-ondark/70">{t("home.partners.label")}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="display mt-6">
              {partnersMatch ? (
                <>
                  <span className="block text-7xl leading-none tabular-nums sm:text-8xl md:text-[9.5rem]">
                    {partnersMatch[1]}
                  </span>
                  <span className="mt-4 block text-2xl md:mt-6 md:text-4xl">
                    {partnersMatch[2]}
                  </span>
                </>
              ) : (
                partnersTitle
              )}
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-7 max-w-md text-[15px] leading-relaxed text-ondark/75">
              {t("home.partners.text")}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-10">
              <Link href="/partners" className="btn btn-ondark">
                {t("home.partners.cta")} →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
