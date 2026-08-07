"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Chrome display text with a very slow diagonal sheen drifting across
 * the glyphs — a gradient band masked to the text, one pass every ~7s.
 * Barely-there by design. Hidden under reduced motion.
 */
export default function ChromeSheen({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="text-chrome">{children}</span>
      {!reduce && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none"
          style={{
            /* chrome-hi as the highlight band, clipped to the glyphs */
            backgroundImage:
              "linear-gradient(115deg, transparent 44%, rgba(236, 238, 241, 0.45) 50%, transparent 56%)",
            backgroundSize: "300% 100%",
            backgroundRepeat: "no-repeat",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
          initial={{ backgroundPosition: "100% 0%" }}
          animate={{ backgroundPosition: "0% 0%" }}
          transition={{ duration: 7, ease: "linear", repeat: Infinity }}
        >
          {children}
        </motion.span>
      )}
    </span>
  );
}
