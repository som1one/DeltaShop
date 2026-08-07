"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export type AccordionEntry = {
  id: string;
  title: string;
  body: string;
};

/**
 * Quiet disclosure rows separated by hairlines. One row open at a time;
 * the "+" collapses into "−" by rotating its vertical bar.
 */
export default function Accordion({
  items,
  className = "",
}: {
  items: AccordionEntry[];
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduce = useReducedMotion();

  return (
    <div className={className}>
      {items.map((item, i) => {
        const open = openId === item.id;
        return (
          <div
            key={item.id}
            className={`border-t hairline ${
              i === items.length - 1 ? "border-b" : ""
            }`}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="label">{item.title}</span>
              <span
                aria-hidden="true"
                className="relative block h-3 w-3 shrink-0"
              >
                <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
                <motion.span
                  className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current"
                  animate={{ rotate: open ? 90 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="body"
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                >
                  <p className="max-w-prose pb-6 text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
