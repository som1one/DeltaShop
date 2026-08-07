"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useLang } from "@/lib/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;

const rise = (reduce: boolean, delay: number): Variants =>
  reduce
    ? {
        hidden: { opacity: 0 },
        shown: { opacity: 1, transition: { duration: 0.4, delay } },
      }
    : {
        hidden: { opacity: 0, y: 26 },
        shown: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: EASE, delay },
        },
      };

/* Module-level (see HeroDiptych): re-renders must not remount children,
   or entrance animations replay. */

function KenBurns({
  reduce,
  children,
}: {
  reduce: boolean;
  children: ReactNode;
}) {
  if (reduce) return <div className="absolute inset-0">{children}</div>;
  return (
    <motion.div
      className="absolute inset-0"
      animate={{ scale: [1, 1.07, 1] }}
      transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Concept A — one cinematic fullscreen stage.
 * The serum scene sits far back as atmosphere (dimmed under three scrims,
 * so the bottle's label can never read); the house wordmark with the real
 * chrome crescent holds the center, framed by a luminous poster hairline.
 */
export default function HeroA() {
  const { t } = useLang();
  const reduce = useReducedMotion() ?? false;

  return (
    <section className="dark-stage relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-28 text-center md:px-10">
      {/* Backdrop — Ken Burns drifts the whole scene, cover-cropped so no
          edges ever show. Mobile gets the text-free top crop; desktop shows
          the full scene with the label zone buried under scrims. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0.4 : 1.6, ease: EASE }}
      >
        <KenBurns reduce={reduce}>
          {/* The text-free top crop on every viewport: at fullscreen aspect
              ratios no object-position can push the printed label out of the
              full scene's frame, so the safe crop is the only honest one.
              Portrait centers the bottle; landscape sets it on the left
              third with the defocused green field breathing on the right. */}
          <Image
            src="/products/forma-serum-hero-m.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[24%_center] opacity-65 md:object-[78%_center]"
          />
        </KenBurns>
        {/* Scrim 1 — vertical: anchors the ink at top (header blend) and
            bottom (stage footer) */}
        <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/20 to-ink/55" />
        {/* Scrim 2 — sinks the bottle mass on the left, keeps the green
            glow alive on the right */}
        <div className="absolute inset-0 bg-linear-to-r from-ink/55 via-transparent to-ink/25" />
        {/* Scrim 3 — a soft pool of ink behind the centered composition */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(58% 46% at 50% 52%, rgba(14,15,18,0.72), rgba(14,15,18,0) 72%)",
          }}
        />
        <div className="grain absolute inset-0" />
      </motion.div>

      {/* Poster frame — a faint luminous hairline inset around the stage */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 z-10 border border-[rgba(217,220,225,0.45)] mix-blend-screen shadow-[0_0_44px_rgba(217,220,225,0.08),inset_0_0_44px_rgba(217,220,225,0.06)] md:inset-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE, delay: reduce ? 0 : 0.9 }}
      />

      {/* Centered composition */}
      <motion.div
        className="relative z-20 flex w-full max-w-5xl flex-col items-center"
        initial="hidden"
        animate="shown"
      >
        <motion.p variants={rise(reduce, 0.15)} className="label label-muted">
          {t("hero.house")}
        </motion.p>

        {/* The wordmark — the footer's chrome pairing, blown up to a title
            card: FORMA · real crescent · VISUAL. The mark scales in em so
            one font-size clamp drives the whole lockup. */}
        <motion.h1
          variants={rise(reduce, 0.27)}
          className="display mt-8 flex flex-col items-center leading-none text-[clamp(3.4rem,16.5vw,5rem)] md:mt-10 md:flex-row md:items-center md:gap-[0.28em] md:text-[clamp(4rem,8.4vw,8.5rem)]"
        >
          <span className="text-chrome">Forma</span>
          <Image
            src="/logo-crescent-512.png"
            alt=""
            width={512}
            height={473}
            priority
            className="my-[0.16em] w-[0.78em] shrink-0 drop-shadow-[0_0_18px_rgba(236,238,241,0.3)] md:my-0"
          />
          <span className="text-chrome">Visual</span>
        </motion.h1>

        <motion.p
          variants={rise(reduce, 0.42)}
          className="accent-serif mt-9 max-w-md text-balance text-lg leading-[1.55] text-ondark/85 md:mt-10 md:max-w-2xl md:text-2xl md:leading-[1.5]"
        >
          {t("home.manifesto")}
        </motion.p>

        <motion.div
          variants={rise(reduce, 0.56)}
          className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:gap-4 md:mt-12"
        >
          <Link href="/forma" className="btn btn-ondark-outline w-full sm:w-auto">
            {t("hero.forma.cta")}
          </Link>
          <Link href="/visual" className="btn btn-ondark w-full sm:w-auto">
            {t("hero.visual.cta")}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
