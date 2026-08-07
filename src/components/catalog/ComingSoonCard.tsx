"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n";

type SoonItem = {
  id: string;
  name: { ru: string; en: string };
  tagline: { ru: string; en: string };
};

/* The real longsleeve-print mark; its own alpha channel clips the shimmer
   so the sweep only lights the watermark. */
const MARK_MASK = "url(/logo-crescent-512.png)";

/**
 * Announced-but-unreleased FORMA slot. Matches ProductCard geometry
 * (4/5 frame + text block) but is deliberately inert: no link, no hover
 * cue. A very slow chrome shimmer drifts across the crescent watermark;
 * it is not rendered at all under reduced motion.
 */
export default function ComingSoonCard({ item }: { item: SoonItem }) {
  const { lang, t } = useLang();
  const reduce = useReducedMotion();

  return (
    <div className="cursor-default" aria-disabled="true">
      <div className="dark-stage grain relative aspect-[4/5] overflow-hidden border hairline">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative aspect-square w-[55%]">
            <Image
              src="/logo-crescent-512.png"
              alt=""
              fill
              sizes="30vw"
              className="object-contain opacity-[0.16]"
            />
            {!reduce && (
              <div
                aria-hidden="true"
                className="absolute inset-0 overflow-hidden"
                style={{
                  maskImage: MARK_MASK,
                  WebkitMaskImage: MARK_MASK,
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                }}
              >
                <motion.span
                  className="absolute inset-0 bg-linear-[115deg,transparent_38%,rgba(236,238,241,0.35)_50%,transparent_62%]"
                  initial={{ x: "-130%" }}
                  animate={{ x: "130%" }}
                  transition={{
                    duration: 6,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 1.5,
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <span className="label absolute left-4 top-4 border hairline px-3 py-1.5 text-ondark">
          {t("catalog.soon")}
        </span>
      </div>
      <div className="pt-4">
        <h3 className="display text-sm tracking-[0.14em]">{item.name[lang]}</h3>
        <p className="mt-1 text-[13px] text-muted">{item.tagline[lang]}</p>
        <p className="label label-muted mt-3">{t("catalog.soon.note")}</p>
      </div>
    </div>
  );
}
