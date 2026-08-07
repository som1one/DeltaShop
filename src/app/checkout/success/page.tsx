"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { useCart } from "@/lib/cart";

const EASE = [0.22, 1, 0.36, 1] as const;

/** SuccessURL Robokassa — сюда покупатель возвращается после оплаты. */
export default function CheckoutSuccessPage() {
  const { t } = useLang();
  const cart = useCart();
  const reduce = useReducedMotion();
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [orderInvId, setOrderInvId] = useState<number | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("fv-last-order");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { token?: string; invId?: number };
        if (parsed.token) setOrderToken(parsed.token);
        if (parsed.invId) setOrderInvId(parsed.invId);
      } catch {
        setOrderToken(raw); // старый формат — просто токен
      }
    }
    /* Наш эффект выполняется раньше гидратации CartProvider, поэтому чистим
       и хранилище: иначе провайдер тут же восстановит корзину из localStorage */
    window.localStorage.removeItem("fv-cart");
    cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="measure gutter pb-24 pt-28 md:pb-36 md:pt-40">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } }}
        className="flex min-h-[52vh] flex-col items-center justify-center text-center"
      >
        <Image
          src="/logo-crescent.png"
          alt=""
          width={46}
          height={42}
          className="invert"
        />
        <h1 className="display mt-7 text-3xl md:text-5xl">
          {t("checkout.done.title")}
        </h1>
        {orderInvId && (
          <p className="label mt-4 tabular-nums">
            {t("order.title")} №{orderInvId}
          </p>
        )}
        {orderToken && (
          <p className="label label-muted mt-2 tracking-[0.18em]">
            {t("order.code.label")}: {orderToken.slice(0, 8).toUpperCase()}
          </p>
        )}
        <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
          {t("checkout.done.text")}
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          {orderToken && (
            <Link href={`/order/${orderToken}`} className="btn btn-primary">
              {t("order.track.cta")}
            </Link>
          )}
          <Link href="/" className="btn btn-onlight-outline">
            {t("checkout.done.back")}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
