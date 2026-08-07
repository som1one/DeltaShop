"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useLang } from "@/lib/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;

/* One size feeds both wordmarks: Prata caps make FORMA and VISUAL almost
   the same width, so a shared clamp keeps the stack a single column.
   20vw fills narrow screens edge to edge; 30svh stops the two lines plus
   the mark from ever outgrowing the viewport on wide displays. */
const GIANT: CSSProperties = {
  fontSize: "max(52px, min(21.5vw, 30svh))",
};

/* Reduced-motion variants must still RESET transforms: useReducedMotion
   is false on the very first render, so the full "hidden" pose (y/scale)
   may already be applied before the preference kicks in — a fade that
   leaves y at 112% keeps the line clipped inside its mask forever. */
const rise = (reduce: boolean, delay: number): Variants =>
  reduce
    ? {
        hidden: { opacity: 0 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.4, delay } },
      }
    : {
        hidden: { opacity: 0, y: 18 },
        shown: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: EASE, delay },
        },
      };

/* The giant lines rise out of an overflow-hidden mask — a curtain reveal
   instead of a floaty fade. Under reduced motion they simply appear. */
const maskRise = (reduce: boolean, delay: number): Variants =>
  reduce
    ? {
        hidden: { opacity: 0 },
        shown: { opacity: 1, y: "0%", transition: { duration: 0.4, delay } },
      }
    : {
        hidden: { y: "112%" },
        shown: {
          y: "0%",
          transition: { duration: 1.0, ease: EASE, delay },
        },
      };

/* Module-level (see HeroDiptych): re-renders must not remount these or the
   entrance replays. Each wordmark is a full-bleed link; the mask wrapper
   carries the font size so its -em margins scale with the type. */
function GiantLine({
  word,
  href,
  cta,
  reduce,
  delay,
  className = "",
}: {
  word: string;
  href: string;
  cta: string;
  reduce: boolean;
  delay: number;
  className?: string;
}) {
  return (
    <div
      className={`relative z-10 overflow-hidden ${className}`}
      style={GIANT}
    >
      <motion.div variants={maskRise(reduce, delay)}>
        <Link
          href={href}
          aria-label={cta}
          className="display block whitespace-nowrap text-[1em] leading-[1.02] text-strong transition-colors duration-500 hover:text-oxblood focus-visible:text-oxblood"
        >
          {word}
        </Link>
      </motion.div>
    </div>
  );
}

/* Small idle drift for the floating accent — off under reduced motion */
function Drift({
  reduce,
  children,
  className,
}: {
  reduce: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -9, 0] }}
      transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Concept B — typographic minimal. No photography as backdrop: the hero is
 * a three-line monument on bone — FORMA / the chrome crescent / VISUAL —
 * with the house line above and a split hairline ledger below. Two small
 * product accents sit in the side margins as marginalia, under the type.
 */
export default function HeroTypographic() {
  const { t } = useLang();
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.section
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-bone"
      initial="hidden"
      animate="shown"
    >
      <h1 className="sr-only">{t("hero.house")}</h1>

      {/* ——— Marginalia (≥ xl only — below that the giant lines span
          almost the full width and the margins can't hold them) ——— */}

      {/* FORMA: a sliver of the ink bottle scene as a porcelain-framed
          plate — the one dark object in a light room. Text-free crop. */}
      <motion.div
        aria-hidden="true"
        variants={rise(reduce, 1.05)}
        className="absolute left-[2.5%] top-[19%] z-0 hidden w-[clamp(96px,9vw,130px)] xl:block"
      >
        <div className="border hairline bg-porcelain p-1.5">
          <div className="relative aspect-[5/6] overflow-hidden">
            <Image
              src="/products/forma-serum-hero-m.png"
              alt=""
              fill
              priority
              sizes="130px"
              className="object-cover object-[10%_50%]"
            />
          </div>
        </div>
      </motion.div>

      {/* VISUAL: the crescent longsleeve floating free on the bone.
          multiply lives on THIS wrapper — the drifting child creates its
          own stacking context, which would isolate the blend from the
          bone behind it and leave the cutout's white box visible. */}
      <motion.div
        aria-hidden="true"
        variants={rise(reduce, 1.15)}
        className="absolute bottom-[12%] right-[1.5%] z-0 hidden w-[clamp(110px,11vw,150px)] mix-blend-multiply xl:block"
      >
        <Drift reduce={reduce}>
          <Image
            src="/products/longsleeve-crescent.png"
            alt=""
            width={1280}
            height={1046}
            priority
            sizes="170px"
            className="h-auto w-full"
          />
        </Drift>
      </motion.div>

      {/* ——— Eyebrow — sits below the blending fixed header ——— */}
      <motion.div
        variants={rise(reduce, 0.1)}
        className="relative z-10 flex items-center justify-center gap-5 pt-24 md:pt-28"
      >
        <span aria-hidden="true" className="h-px w-8 bg-linen md:w-12" />
        <p className="label label-muted text-center">{t("hero.house")}</p>
        <span aria-hidden="true" className="h-px w-8 bg-linen md:w-12" />
      </motion.div>

      {/* ——— The monument ——— */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-6">
        <GiantLine
          word="FORMA"
          href="/forma"
          cta={t("hero.forma.cta")}
          reduce={reduce}
          delay={0.25}
          className="mb-[-0.01em]"
        />

        {/* The crescent — its one moment. The bare print mark, inverted to
            charcoal so it holds on bone without a plate, with clear air
            above and below. */}
        <motion.div
          variants={
            reduce
              ? {
                  hidden: { opacity: 0 },
                  shown: { opacity: 1, transition: { duration: 0.4, delay: 0.5 } },
                }
              : {
                  hidden: { opacity: 0, y: 10 },
                  shown: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, ease: EASE, delay: 0.5 },
                  },
                }
          }
          className="relative z-0 flex items-center justify-center"
        >
          <Image
            src="/logo-crescent-512.png"
            alt=""
            width={512}
            height={473}
            priority
            className="h-auto w-[clamp(66px,7.5vw,100px)] opacity-85 invert"
          />
        </motion.div>

        <GiantLine
          word="VISUAL"
          href="/visual"
          cta={t("hero.visual.cta")}
          reduce={reduce}
          delay={0.65}
          className="mt-[0.15em]"
        />
      </div>

      {/* ——— Ledger: one hairline row, two houses ——— */}
      <motion.div
        variants={rise(reduce, 0.9)}
        className="relative z-10 border-t hairline pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid md:grid-cols-2">
          <div className="gutter flex items-baseline justify-between gap-6 py-5 md:py-6">
            <span className="label label-muted">{t("hero.forma.tag")}</span>
            <Link href="/forma" className="label link-quiet whitespace-nowrap">
              {t("hero.forma.cta")} →
            </Link>
          </div>
          <div className="gutter flex items-baseline justify-between gap-6 border-t hairline py-5 md:border-l md:border-t-0 md:py-6">
            <span className="label label-muted">{t("hero.visual.tag")}</span>
            <Link href="/visual" className="label link-quiet whitespace-nowrap">
              {t("hero.visual.cta")} →
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}
