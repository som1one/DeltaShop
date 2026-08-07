"use client";

import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { RevealGroup, RevealItem } from "@/components/Reveal";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import ComingSoonCard from "@/components/catalog/ComingSoonCard";
import { formatPrice, useLang } from "@/lib/i18n";
import { byHouse, comingSoon, type Product } from "@/lib/products";

/**
 * Hero variant for the house's single released product.
 * Same conventions as ProductCard's cover mode — ink stage, full-bleed
 * photo, hover cue, name/tagline/price row — but shine-free and
 * horizontal: two columns of the three-column grid, 7/5 on lg+.
 */
function HeroCoverCard({ product }: { product: Product }) {
  const { lang, t } = useLang();

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block"
      aria-label={product.name[lang]}
    >
      <div className="dark-stage hairline relative aspect-[4/5] overflow-hidden border transition-colors duration-500 group-hover:border-(--text-muted) lg:aspect-[7/5]">
        {/* Oversized layer resting downscaled — hover eases to 1:1; crisp
            at every phase, compositor-smooth (see ProductCard) */}
        <div className="absolute -inset-[2%] scale-[.962] transition-transform duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100">
          <Image
            src={product.image}
            alt={product.name[lang]}
            fill
            sizes="(max-width: 640px) 96vw, (max-width: 1024px) 46vw, 64vw"
            priority
            className="object-cover opacity-90"
          />
        </div>
        {/* Hover cue */}
        <span className="label absolute bottom-4 right-4 translate-y-2 text-ondark opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          {t("product.video.play")} →
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4 pt-4">
        <div>
          <h3 className="display text-sm tracking-[0.14em] lg:text-base">
            {product.name[lang]}
          </h3>
          <p className="mt-1 text-[13px] text-muted lg:text-sm">
            {product.tagline[lang]}
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums lg:text-base">
          {formatPrice(lang, product.priceRub, product.priceUsd)}
        </span>
      </div>
    </Link>
  );
}

export default function FormaCataloguePage() {
  const items = byHouse("forma");
  const [hero, ...rest] = items;

  return (
    <div className="pt-28 md:pt-40">
      <section className="measure gutter pb-24 md:pb-36">
        <CatalogHeader
          subKey="catalog.forma.sub"
          titleKey="catalog.forma.title"
          count={items.length}
          introKey="home.forma.text"
        />
        <RevealGroup className="mt-14 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 md:mt-20 lg:grid-cols-3">
          {hero ? (
            <RevealItem key={hero.id} className="lg:col-span-2">
              <HeroCoverCard product={hero} />
            </RevealItem>
          ) : null}
          {rest.map((product, i) => (
            <RevealItem key={product.id}>
              <ProductCard product={product} priority={i < 2} />
            </RevealItem>
          ))}
          {comingSoon.map((item) => (
            <RevealItem key={item.id}>
              <ComingSoonCard item={item} />
            </RevealItem>
          ))}
        </RevealGroup>
      </section>
    </div>
  );
}
