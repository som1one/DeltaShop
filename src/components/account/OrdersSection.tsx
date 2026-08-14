"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { formatPrice, useLang, type DictKey } from "@/lib/i18n";
import { useProducts } from "@/lib/products-context";

const EASE = [0.22, 1, 0.36, 1] as const;

type OrderItem = {
  productId: string;
  size: string | null;
  qty: number;
  priceRub: number;
};

type AccountOrder = {
  invId: number;
  token: string;
  status:
    | "new"
    | "paid"
    | "accepted"
    | "shipped"
    | "delivered"
    | "cancelled";
  items: OrderItem[];
  totalRub: number;
  track: string | null;
  createdAt: string;
};

/** История заказов покупателя: статус, состав, ссылка на отслеживание. */
export default function OrdersSection() {
  const { lang, t } = useLang();
  const { get } = useProducts();
  const reduce = useReducedMotion();
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [paying, setPaying] = useState<number | null>(null);
  const [payError, setPayError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/account/orders", { cache: "no-store" })
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) {
          setOrders([]);
          return;
        }
        const data = (await res.json()) as { orders: AccountOrder[] };
        setOrders(data.orders);
      })
      .catch(() => alive && setOrders([]));
    return () => {
      alive = false;
    };
  }, []);

  const pay = async (invId: number) => {
    setPaying(invId);
    setPayError(false);
    try {
      const res = await fetch(`/api/account/orders/${invId}/pay`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        url?: string;
      } | null;
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      /* Приём оплаты не настроен или провайдер не ответил — заказ остаётся
         неоплаченным, и об этом говорится прямо */
      setPayError(true);
    } catch {
      setPayError(true);
    } finally {
      setPaying(null);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const usdTotal = (items: OrderItem[]) =>
    items.reduce((sum, item) => {
      const product = get(item.productId);
      return (
        sum +
        (product ? product.priceUsd : Math.round(item.priceRub / 92)) * item.qty
      );
    }, 0);

  /* Список приезжает после запроса, поэтому оживляем его не по прокрутке,
     а сразу — лесенкой сверху вниз */
  const item: Variants = reduce
    ? { hidden: { opacity: 0 }, shown: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 20 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
      };

  if (orders === null) {
    return <div className="min-h-[30vh]" aria-busy="true" />;
  }

  if (orders.length === 0) {
    return (
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="border hairline bg-porcelain px-7 py-14 text-center md:py-20"
      >
        <p className="display text-2xl md:text-3xl">
          {t("account.orders.empty")}
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm text-muted">
          {t("account.orders.empty.note")}
        </p>
        <Link href="/visual" className="btn btn-onlight-outline mt-9">
          {t("account.orders.cta")}
        </Link>
      </motion.div>
    );
  }

  return (
    <>
      {payError && (
        <p className="field-error mb-6" role="alert">
          {t("account.orders.payfailed")}
        </p>
      )}
      <motion.ul
        className="border-t hairline"
        initial="hidden"
        animate="shown"
        variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.07 } } }}
      >
        {orders.map((order) => (
          <motion.li
            key={order.invId}
            variants={item}
            className="grid gap-x-8 gap-y-5 border-b hairline py-8 md:grid-cols-[1fr_auto] md:py-10"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <p className="display text-lg tracking-[0.1em] md:text-xl">
                  {t("order.title")} №{order.invId}
                </p>
                <span className="label label-muted">
                  {fmtDate(order.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-muted">
                {t(`order.status.${order.status}` as DictKey)}
                {order.track && (
                  <>
                    <span aria-hidden="true"> · </span>
                    {t("order.track.label")}: {order.track}
                  </>
                )}
              </p>
              <p className="mt-3 truncate text-[13px]">
                {order.items
                  .map((item) => {
                    const product = get(item.productId);
                    const title = product ? product.name[lang] : item.productId;
                    return item.size ? `${title} · ${item.size}` : title;
                  })
                  .join(", ")}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <span className="display text-xl tabular-nums tracking-[0.06em]">
                {formatPrice(lang, order.totalRub, usdTotal(order.items))}
              </span>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <Link
                  href={`/order/${order.token}`}
                  className="link-quiet label"
                >
                  {t("account.orders.open")}
                </Link>
                {order.status === "new" && (
                  <button
                    type="button"
                    onClick={() => pay(order.invId)}
                    disabled={paying === order.invId}
                    className="label link-quiet text-(--oxblood-bright) disabled:cursor-wait disabled:opacity-60"
                  >
                    {paying === order.invId
                      ? t("account.orders.paying")
                      : t("account.orders.pay")}
                  </button>
                )}
              </div>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </>
  );
}
