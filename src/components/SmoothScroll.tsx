"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Inertial page scrolling via Lenis. Skipped entirely under
 * prefers-reduced-motion; nested scroll areas opt out with
 * data-lenis-prevent.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 0.35,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
