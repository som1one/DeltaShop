"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice, useLang } from "@/lib/i18n";
import type { Product } from "@/lib/products";

/**
 * Catalogue card. Cutout shots sit on porcelain and blend in via multiply;
 * cover shots (the FORMA bottle) fill the frame on ink.
 */
export default function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { lang, t } = useLang();
  const cutout = product.imageStyle === "cutout";

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block"
      aria-label={product.name[lang]}
    >
      <div
        className={`relative aspect-[4/5] overflow-hidden border transition-[border-color,box-shadow] duration-500 group-hover:border-(--text-muted) group-hover:shadow-[0_22px_44px_-28px_rgba(20,21,25,0.35)] ${
          cutout ? "bg-porcelain hairline" : "dark-stage hairline"
        }`}
      >
        {/* Hover zoom without blur or jitter: the layer is laid out 4%
            oversized and rests DOWNscaled (scale .962 ≈ visually 100%);
            hover eases it to scale 1. The texture never stretches past its
            raster size (no мыло), and the compositor animates it sub-pixel
            smooth (no layout jitter). Own bg keeps the multiply blend
            stable while composited. */}
        <div
          className={`absolute -inset-[2%] scale-[.962] transition-transform duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 ${
            cutout ? "bg-porcelain" : ""
          }`}
        >
          <Image
            src={product.image}
            alt={product.name[lang]}
            fill
            sizes="(max-width: 768px) 96vw, (max-width: 1280px) 46vw, 31vw"
            priority={priority}
            className={
              cutout
                ? "object-contain p-[9%] mix-blend-multiply"
                : "object-cover opacity-90"
            }
          />
        </div>
        {/* Hover cue */}
        <span
          className={`label absolute bottom-4 right-4 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 ${
            cutout ? "text-strong" : "text-ondark"
          }`}
        >
          {t("product.video.play")} →
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4 pt-4">
        <div>
          <h3 className="display text-sm tracking-[0.14em]">
            {product.name[lang]}
          </h3>
          <p className="mt-1 text-[13px] text-muted">
            {product.tagline[lang]}
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums">
          {formatPrice(lang, product.priceRub, product.priceUsd)}
        </span>
      </div>
    </Link>
  );
}
