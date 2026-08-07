"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;

/** FailURL Robokassa — оплата отменена или не прошла; корзина сохранена. */
export default function CheckoutFailPage() {
  const { t } = useLang();
  const reduce = useReducedMotion();

  return (
    <section className="measure gutter pb-24 pt-28 md:pb-36 md:pt-40">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } }}
        className="flex min-h-[52vh] flex-col items-center justify-center text-center"
      >
        <h1 className="display text-3xl md:text-5xl">
          {t("checkout.fail.title")}
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
          {t("checkout.fail.text")}
        </p>
        <Link href="/checkout" className="btn btn-primary mt-9">
          {t("checkout.fail.retry")}
        </Link>
      </motion.div>
    </section>
  );
}
