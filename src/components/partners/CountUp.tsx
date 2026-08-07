"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Counts from 0 to `value` over ~1.2s once the number scrolls into view.
 * The raw number is what animates; `format` re-applies the locale
 * formatting on every frame so grouping/currency never break.
 * Static under reduced motion.
 */
export default function CountUp({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (reduce) {
      setCurrent(value);
      return;
    }
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: EASE,
      onUpdate: (v) => setCurrent(v),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return <span ref={ref}>{format(current)}</span>;
}
