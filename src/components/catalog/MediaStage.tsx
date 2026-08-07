"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import type { Product } from "@/lib/products";

/**
 * Product-page media stage: a 4/5 frame that plays the AI-model video
 * when supplied, and otherwise shows the photo under a quietly pulsing
 * chrome play mark with a "video coming soon" caption.
 */
export default function MediaStage({ product }: { product: Product }) {
  const { lang, t } = useLang();
  const reduce = useReducedMotion();
  const cutout = product.imageStyle === "cutout";

  return (
    <div
      className={`relative aspect-[4/5] overflow-hidden border hairline ${
        cutout ? "bg-porcelain" : "dark-stage grain"
      }`}
    >
      {product.video ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={product.image}
          aria-label={product.name[lang]}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={product.video} />
        </video>
      ) : (
        <>
          <Image
            src={product.image}
            alt={product.name[lang]}
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 46vw"
            className={
              cutout
                ? "object-contain p-[9%] mix-blend-multiply"
                : "object-cover opacity-90"
            }
          />
          {/* Quiet video affordance pinned to the stage's lower edge so it
              never covers the product */}
          {!cutout && (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-ink/85 to-transparent"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-4 p-5 md:p-6">
            <motion.span
              aria-hidden="true"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                cutout ? "border-strong/35" : "border-chrome"
              }`}
              animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
              transition={
                reduce
                  ? undefined
                  : { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <svg
                width="11"
                height="13"
                viewBox="0 0 14 16"
                aria-hidden="true"
                className={cutout ? "ml-0.5 fill-strong/70" : "ml-0.5 fill-chrome"}
              >
                <path d="M0 0 L14 8 L0 16 Z" />
              </svg>
            </motion.span>
            <span className="label label-muted">{t("product.video.soon")}</span>
          </div>
        </>
      )}
    </div>
  );
}
