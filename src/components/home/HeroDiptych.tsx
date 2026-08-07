"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { getProduct } from "@/lib/products";

const EASE = [0.22, 1, 0.36, 1] as const;

type PanelId = "forma" | "visual";

const serum = getProduct("forma-serum")!;
const longsleeve = getProduct("longsleeve-crescent")!;

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

/* Module-level component: hover re-renders of the hero must NOT remount it,
   or the entrance animation replays and the text blinks away. Identical
   text-stack geometry on both panels keeps titles/lines/CTAs on shared
   baselines — the one-line tagline reserves two lines. */
function TextStack({
  eyebrow,
  title,
  line,
  href,
  cta,
  dark,
  delayBase,
  reduce,
}: {
  eyebrow: string;
  title: string;
  line: string;
  href: string;
  cta: string;
  dark: boolean;
  delayBase: number;
  reduce: boolean;
}) {
  return (
    <div className="relative z-10 flex w-full shrink-0 flex-col items-center px-6 pb-8 text-center md:pb-24">
      <motion.p variants={rise(reduce, delayBase)} className="label label-muted">
        {eyebrow}
      </motion.p>
      <motion.h2
        variants={rise(reduce, delayBase + 0.1)}
        className={`display mt-3 text-[44px] leading-none sm:text-6xl md:mt-5 md:text-7xl 2xl:text-8xl ${
          dark ? "" : "text-strong"
        }`}
      >
        {title}
      </motion.h2>
      <motion.p
        variants={rise(reduce, delayBase + 0.2)}
        className={`mt-2 flex max-w-xs items-start justify-center text-[13px] sm:max-w-sm md:mt-5 md:min-h-[3.2em] md:text-[15px] ${
          dark ? "text-ondark-muted" : "text-muted"
        }`}
      >
        {line}
      </motion.p>
      <motion.div variants={rise(reduce, delayBase + 0.3)} className="mt-4 md:mt-4">
        <Link
          href={href}
          className={`btn ${dark ? "btn-ondark-outline" : "btn-onlight-outline"}`}
        >
          {cta}
        </Link>
      </motion.div>
    </div>
  );
}

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
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Full-viewport split diptych: FORMA (dark stage) | VISUAL (porcelain).
 * On desktop the hovered panel eases its flex-basis to 56% — the diptych
 * breathes. An ink badge with the chrome crescent holds the seam.
 */
export default function HeroDiptych() {
  const { t } = useLang();
  const reduce = useReducedMotion() ?? false;
  const [hovered, setHovered] = useState<PanelId | null>(null);

  const basis = (panel: PanelId) =>
    hovered === null ? "50%" : hovered === panel ? "56%" : "44%";

  const panelVariants: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        shown: { opacity: 1, transition: { duration: 0.4 } },
      }
    : {
        hidden: { opacity: 0, clipPath: "inset(0% 0% 12% 0%)" },
        shown: {
          opacity: 1,
          clipPath: "inset(0% 0% 0% 0%)",
          transition: { duration: 0.9, ease: EASE },
        },
      };

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden md:flex-row">
      <h1 className="sr-only">{t("hero.house")}</h1>

      {/* FORMA — dark cinematic panel: atmospheric cover photo under scrims */}
      <motion.div
        className="dark-stage relative flex min-h-0 min-w-0 flex-1 basis-0 flex-col justify-end overflow-hidden md:flex-none md:grow md:basis-(--fb) md:transition-[flex-basis] md:duration-700 md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
        style={{ "--fb": basis("forma") } as CSSProperties}
        variants={panelVariants}
        initial="hidden"
        animate="shown"
        onMouseEnter={() => setHovered("forma")}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => setHovered("forma")}
        onBlur={() => setHovered(null)}
      >
        <KenBurns reduce={reduce}>
          {/* Mobile: a dedicated top-of-bottle crop — the tall panel shows the
              near-square photo at full height, so the label text cannot be
              cropped away with object-position alone */}
          <Image
            src="/products/forma-serum-hero-m.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[60%_center] opacity-60 md:hidden"
          />
          <Image
            src={serum.image}
            alt=""
            fill
            priority
            sizes="56vw"
            className="hidden object-cover object-[70%_center] opacity-60 md:block"
          />
        </KenBurns>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-ink via-ink/35 to-ink/55"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-r from-ink/45 via-transparent to-ink/45"
        />
        <div aria-hidden="true" className="grain absolute inset-0" />
        <TextStack
          eyebrow={t("hero.forma.tag")}
          title={t("hero.forma.title")}
          line={t("hero.forma.line")}
          href="/forma"
          cta={t("hero.forma.cta")}
          dark
          delayBase={0.1}
          reduce={reduce}
        />
      </motion.div>

      {/* Seam — a luminous hairline runs the full height through the moon
          badge, so the divide reads top to bottom on both halves */}
      <div
        aria-hidden="true"
        className="relative z-30 h-0 w-full md:h-auto md:w-0 md:self-stretch"
      >
        <motion.div
          className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 mix-blend-difference md:block"
          style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.4 }}
        />
        <motion.div
          className="absolute left-7 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(155,161,171,0.45)] bg-ink shadow-[0_2px_28px_rgba(14,15,18,0.4)] md:left-1/2 md:h-20 md:w-20 md:-translate-x-1/2"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
        >
          {/* The real mark, lifted from the longsleeve print */}
          <Image
            src="/logo-crescent.png"
            alt=""
            width={44}
            height={41}
            className="w-[22px] opacity-95 md:w-[44px]"
          />
        </motion.div>
      </div>

      {/* VISUAL — porcelain panel: the photo owns its zone, text sits below,
          so they can never collide at any viewport height */}
      <motion.div
        className="relative flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden bg-porcelain md:flex-none md:grow md:basis-(--fb) md:transition-[flex-basis] md:duration-700 md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
        style={{ "--fb": basis("visual") } as CSSProperties}
        variants={panelVariants}
        initial="hidden"
        animate="shown"
        onMouseEnter={() => setHovered("visual")}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => setHovered("visual")}
        onBlur={() => setHovered(null)}
      >
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-x-[8%] bottom-[2%] top-9 hidden [@media(min-height:730px)]:block md:block md:bottom-[4%] md:top-[16%]">
            <Image
              src={longsleeve.image}
              alt=""
              fill
              priority
              sizes="(max-width: 767px) 88vw, 50vw"
              className="object-contain mix-blend-multiply"
            />
          </div>
        </div>
        <TextStack
          eyebrow={t("hero.visual.tag")}
          title={t("hero.visual.title")}
          line={t("hero.visual.line")}
          href="/visual"
          cta={t("hero.visual.cta")}
          dark={false}
          delayBase={0.15}
          reduce={reduce}
        />
      </motion.div>

      {/* House line — blends over both panels like the header */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 hidden justify-center mix-blend-difference text-white md:bottom-7 md:flex">
        <motion.span
          className="label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
        >
          {t("hero.house")}
        </motion.span>
      </div>
    </section>
  );
}
