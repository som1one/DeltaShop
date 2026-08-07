"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

/**
 * 4/5 image frame with a subtle scroll parallax: the picture drifts
 * vertically within ~±7% of the frame while the section crosses the
 * viewport. The inner layer is overscanned by 9% top and bottom so the
 * drift never exposes an edge; overflow-hidden clips the rest.
 * Static under reduced motion.
 */
export default function ParallaxFrame({
  children,
  className = "",
  layerClassName = "",
}: {
  children: ReactNode;
  className?: string;
  /** Classes for the moving layer itself — a transformed layer isolates
      mix-blend-mode, so a blended image needs its background HERE. */
  layerClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  /* ±6% of the overscanned layer (118% tall) ≈ ±7% of the frame */
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  /* SSR renders the moving branch (preference unknown server-side) with an
     initial translate; hydration keeps that stale inline style on the static
     branch, so clear it once the reduced preference is known. */
  const staticRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduce && staticRef.current) staticRef.current.style.transform = "none";
  }, [reduce]);

  const layer = `absolute inset-x-0 -top-[9%] -bottom-[9%] ${layerClassName}`;
  return (
    <div
      ref={ref}
      className={`relative aspect-[4/5] overflow-hidden ${className}`}
    >
      {reduce ? (
        <div ref={staticRef} className={layer}>
          {children}
        </div>
      ) : (
        <motion.div className={layer} style={{ y }}>
          {children}
        </motion.div>
      )}
    </div>
  );
}
