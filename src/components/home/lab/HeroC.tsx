"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useLang } from "@/lib/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;
/* A dissolve wants a symmetric curve — the house EASE front-loads and the
   1.2s crossfade would read as a 0.5s cut with a long tail */
const DISSOLVE = [0.45, 0, 0.55, 1] as const;

const SLIDE_MS = 6000;
const RESUME_MS = 12000;
const FADE_S = 1.2;

type SlideIndex = 0 | 1;

const rise = (reduce: boolean, delay: number): Variants =>
  reduce
    ? {
        hidden: { opacity: 0 },
        shown: { opacity: 1, transition: { duration: 0.4, delay } },
      }
    : {
        hidden: { opacity: 0, y: 22 },
        shown: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: EASE, delay },
        },
      };

/* Module-level components (see HeroDiptych): pause/hover re-renders of the
   hero must NOT remount the live slide, or its entrance replays. Slides DO
   remount on rotation — that is the point: the text rises in fresh each time. */

/** One slow breath per slide lifetime — the backdrop drifts while it is on
    stage. Outlives the 6s + 1.2s slide life so it never visibly stops. */
function Drift({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  if (reduce) return <div className="absolute inset-0">{children}</div>;
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ scale: 1 }}
      animate={{ scale: 1.055 }}
      transition={{ duration: 10, ease: "linear" }}
    >
      {children}
    </motion.div>
  );
}

/** Identical text geometry on both slides, so the statements swap in place:
    centered above the house line on mobile, an editorial column on desktop —
    FORMA speaks from the right page, VISUAL answers from the left. */
function TextBlock({
  side,
  dark,
  eyebrow,
  title,
  line,
  cta,
  href,
  reduce,
}: {
  side: "left" | "right";
  dark: boolean;
  eyebrow: string;
  title: string;
  line: string;
  cta: string;
  href: string;
  reduce: boolean;
}) {
  /* Text enters during the second half of the dissolve — the stage is
     mostly set before anyone starts speaking */
  const base = 0.45;
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end md:justify-center">
      <div className="gutter measure w-full pb-28 md:pb-0">
        <motion.div
          initial="hidden"
          animate="shown"
          /* When the layer starts dissolving away, its statement bows out
             first — two houses must never speak over each other */
          exit={{ opacity: 0, transition: { duration: 0.35, ease: EASE } }}
          className={`flex flex-col items-center text-center md:max-w-[46%] md:items-start md:text-left lg:max-w-[42%] ${
            side === "right" ? "md:ml-auto" : ""
          }`}
        >
          <motion.p variants={rise(reduce, base)} className="label label-muted">
            {eyebrow}
          </motion.p>
          <motion.h2
            variants={rise(reduce, base + 0.08)}
            className={`display mt-5 text-[17vw] sm:text-7xl md:text-[clamp(4.75rem,9vw,8.25rem)] ${
              dark ? "" : "text-strong"
            }`}
          >
            {title}
          </motion.h2>
          <motion.p
            variants={rise(reduce, base + 0.16)}
            className={`mt-5 max-w-xs text-sm md:max-w-sm md:text-[15px] ${
              dark ? "text-ondark-muted" : "text-muted"
            }`}
          >
            {line}
          </motion.p>
          <motion.div variants={rise(reduce, base + 0.24)} className="mt-8">
            <Link
              href={href}
              className={`btn ${dark ? "btn-ondark-outline" : "btn-onlight-outline"}`}
            >
              {cta}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/** Statement 1 — FORMA. Ink stage, the serum scene far back as atmosphere.
    The text-free top crop on every viewport — at fullscreen aspect ratios no
    object-position can push the printed label out of the full scene's frame,
    so the safe crop is the only honest one. The bottle stands as an abstract
    dark column on the left page; the copy sits over the defocused green
    field on the right. */
function FormaSlide({ reduce }: { reduce: boolean }) {
  const { t } = useLang();
  return (
    <div className="dark-stage relative h-full">
      <Drift reduce={reduce}>
        <Image
          src="/products/forma-serum-hero-m.png"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-[55%_center] opacity-75 md:object-center md:opacity-65"
        />
      </Drift>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-ink via-ink/30 to-ink/50"
      />
      {/* Left scrim grounds the bottle column; right scrim seats the copy */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-linear-to-r from-ink/70 via-ink/25 to-transparent md:block"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-linear-to-l from-ink/70 via-ink/25 to-transparent md:block"
      />
      <div aria-hidden="true" className="grain absolute inset-0" />
      <TextBlock
        side="right"
        dark
        eyebrow={t("hero.forma.tag")}
        title={t("hero.forma.title")}
        line={t("hero.forma.line")}
        cta={t("hero.forma.cta")}
        href="/forma"
        reduce={reduce}
      />
    </div>
  );
}

/** Statement 2 — VISUAL. Porcelain daylight after the ink: the longsleeve
    hangs large on the right page (multiply melts its white box into the
    porcelain), the copy answers from the left. */
function VisualSlide({ reduce }: { reduce: boolean }) {
  const { t } = useLang();
  return (
    <div className="relative h-full bg-porcelain">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-linen/60 via-transparent to-transparent"
      />
      <div className="absolute inset-x-[10%] top-[12%] bottom-[42%] md:inset-x-auto md:inset-y-[9%] md:right-[3%] md:w-[50%]">
        <Image
          src="/products/longsleeve-crescent.png"
          alt=""
          fill
          sizes="(max-width: 767px) 80vw, 50vw"
          className="object-contain mix-blend-multiply"
        />
      </div>
      <TextBlock
        side="left"
        dark={false}
        eyebrow={t("hero.visual.tag")}
        title={t("hero.visual.title")}
        line={t("hero.visual.line")}
        cta={t("hero.visual.cta")}
        href="/visual"
        reduce={reduce}
      />
    </div>
  );
}

/**
 * Concept C — the hero as two alternating full-viewport statements.
 * FORMA (ink) and VISUAL (porcelain) take turns every 6s behind a slow 1.2s
 * dissolve: the leaving slide holds under the arriving one, so the swap reads
 * as a film dissolve, never a flash of backdrop. Persistent chrome — the house line
 * bottom-center and two dash indicators bottom-right — blends over both tones.
 * Hover or a manual choice pauses the rotation (manual resumes after 12s);
 * under reduced motion nothing rotates and the dashes still switch.
 */
export default function HeroC() {
  const { t } = useLang();
  const reduce = useReducedMotion() ?? false;

  const [index, setIndex] = useState<SlideIndex>(0);
  /* Stacking generation: the arriving layer renders with a higher z-index
     than the layer it covers; reset to 1 once every exit has finished */
  const [gen, setGen] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const resumeTimer = useRef<number | null>(null);

  const fade = reduce ? 0.4 : FADE_S;

  useEffect(() => {
    if (reduce || hovered || focused || suspended) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i === 0 ? 1 : 0));
      setGen((g) => g + 1);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduce, hovered, focused, suspended]);

  useEffect(
    () => () => {
      if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    },
    [],
  );

  const choose = (i: SlideIndex) => {
    if (i === index) return;
    setIndex(i);
    setGen((g) => g + 1);
    setSuspended(true);
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(
      () => setSuspended(false),
      RESUME_MS,
    );
  };

  /* Keyboard focus inside the hero pauses the rotation — a slide must never
     be pulled out from under someone tabbing through it. Mouse clicks leave
     focus behind on the dashes, so only :focus-visible counts. */
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const el = e.target as HTMLElement;
    if (el.matches?.(":focus-visible")) setFocused(true);
  };
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null))
      setFocused(false);
  };

  const titles: [string, string] = [
    t("hero.forma.title"),
    t("hero.visual.title"),
  ];

  return (
    <section
      className="relative min-h-[100svh] overflow-hidden bg-ink"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <h1 className="sr-only">{t("hero.house")}</h1>

      {/* Warm the VISUAL slide's image before its first entrance — the
          dissolve must arrive complete, not loading */}
      <div
        aria-hidden="true"
        className="invisible absolute inset-0 z-0"
      >
        <Image
          src="/products/longsleeve-crescent.png"
          alt=""
          fill
          loading="eager"
          sizes="(max-width: 767px) 80vw, 50vw"
        />
      </div>

      <AnimatePresence onExitComplete={() => setGen(1)}>
        <motion.div
          key={index === 0 ? "forma" : "visual"}
          className="absolute inset-0 overflow-hidden"
          style={{ zIndex: gen }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: fade, ease: DISSOLVE },
          }}
          /* The covered slide holds at full opacity for the whole dissolve
             and unmounts only once the arriving layer has sealed over it */
          exit={{ opacity: 0, transition: { delay: fade, duration: 0.01 } }}
        >
          {index === 0 ? (
            <FormaSlide reduce={reduce} />
          ) : (
            <VisualSlide reduce={reduce} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Persistent chrome — mirrors the header bar's height at the foot of
          the stage; difference-blend keeps it legible over ink and porcelain */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 mix-blend-difference text-white">
        <div className="gutter measure grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[72px]">
          <span />
          <span className="label text-center">{t("hero.house")}</span>
          <div className="pointer-events-auto flex items-center justify-end gap-1">
            {([0, 1] as const).map((i) => (
              <button
                key={i}
                type="button"
                aria-label={titles[i]}
                aria-current={index === i}
                onClick={() => choose(i)}
                className="group flex h-10 w-8 items-center justify-center md:w-10"
              >
                <span
                  aria-hidden="true"
                  className={`h-[2px] w-6 bg-white transition-opacity duration-500 ${
                    index === i
                      ? "opacity-100"
                      : "opacity-30 group-hover:opacity-60 group-focus-visible:opacity-60"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
