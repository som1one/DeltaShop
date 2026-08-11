"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice, useLang } from "@/lib/i18n";
import type { Product } from "@/lib/products";

/**
 * Lead card of an editorial grid: same conventions as ProductCard —
 * porcelain frame, multiply cutout, hover cue, name/tagline/price row —
 * but shine-free and horizontal. Meant to span two columns and open to
 * 7/5 on lg+, so a five-item grid closes without an orphan row.
 */
export default function HeroProductCard({
  product,
  priority = false,
  sizes = "(max-width: 640px) 96vw, (max-width: 1024px) 92vw, 60vw",
}: {
  product: Product;
  priority?: boolean;
  /** Must match how many columns the card spans at each breakpoint. */
  sizes?: string;
}) {
  const { lang, t } = useLang();

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block"
      aria-label={product.name[lang]}
    >
      <div className="bg-porcelain hairline relative aspect-[4/5] overflow-hidden border transition-colors duration-500 group-hover:border-(--text-muted) lg:aspect-[7/5]">
        {/* Oversized layer resting downscaled — hover eases to 1:1; crisp
            at every phase, compositor-smooth (see ProductCard) */}
        <div className="absolute -inset-[2%] scale-[.962] bg-porcelain transition-transform duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100">
          <Image
            src={product.image}
            alt={product.name[lang]}
            fill
            sizes={sizes}
            priority={priority}
            className="object-contain p-[8%] mix-blend-multiply"
          />
        </div>
        {/* Hover cue */}
        <span className="label absolute bottom-4 right-4 translate-y-2 text-strong opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
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
