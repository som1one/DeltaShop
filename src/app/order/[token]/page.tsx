"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPrice, useLang, type DictKey } from "@/lib/i18n";
import { useProducts } from "@/lib/products-context";
import Reveal from "@/components/Reveal";

type OrderItem = {
  productId: string;
  size: string | null;
  qty: number;
  priceRub: number;
};

type PublicOrder = {
  invId: number;
  status: "new" | "paid" | "accepted" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  totalRub: number;
  region: "cis" | "intl";
  city: string;
  track: string | null;
  stageNotes?: Record<string, string>;
  createdAt: string;
  paidAt: string | null;
  updatedAt: string;
};

/* Лента начинается с оплаты: пока заказ не оплачен, ни один этап не пройден,
   а «оформлен и ждёт оплаты» говорится строкой над лентой. */
const FLOW: PublicOrder["status"][] = [
  "paid",
  "accepted",
  "shipped",
  "delivered",
];

/** Страница отслеживания заказа по секретной ссылке. */
export default function OrderPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const { lang, t } = useLang();

  const { get } = useProducts();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">(
    "loading",
  );

  useEffect(() => {
    let alive = true;
    fetch(`/api/order/${token}`)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) {
          setState("missing");
          return;
        }
        setOrder((await res.json()) as PublicOrder);
        setState("ready");
      })
      .catch(() => alive && setState("missing"));
    return () => {
      alive = false;
    };
  }, [token]);

  if (state === "loading") {
    return <div className="min-h-[60vh]" aria-busy="true" />;
  }

  if (state === "missing" || !order) {
    return (
      <section className="measure gutter pb-24 pt-28 md:pb-36 md:pt-40">
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <h1 className="display text-3xl md:text-5xl">
            {t("order.notfound")}
          </h1>
          <p className="mt-5 max-w-md text-sm text-muted">
            {t("order.notfound.note")}
          </p>
          <Link href="/order" className="btn btn-onlight-outline mt-9">
            {t("order.lookup.title")}
          </Link>
        </div>
      </section>
    );
  }

  const cancelled = order.status === "cancelled";
  /* Неоплаченный заказ (и отменённый до оплаты) не проходит ни одного этапа */
  const reachedIndex = cancelled
    ? order.paidAt
      ? 0
      : -1
    : FLOW.indexOf(order.status);
  const steps: { key: PublicOrder["status"]; reached: boolean }[] = (
    cancelled ? (FLOW.slice(0, Math.max(reachedIndex + 1, 0)) as typeof FLOW) : FLOW
  ).map((key, i) => ({ key, reached: i <= reachedIndex }));
  if (cancelled) steps.push({ key: "cancelled", reached: true });

  const notes = order.stageNotes ?? {};

  const dateFor = (key: PublicOrder["status"]): string | null => {
    if (key === "paid") return order.paidAt;
    if (key === "cancelled" || key === order.status) return order.updatedAt;
    return null;
  };

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
          day: "numeric",
          month: "long",
        })
      : null;

  return (
    <section className="measure gutter pb-24 pt-28 md:pb-36 md:pt-40">
      <Reveal>
        <p className="label label-muted">{t("footer.info")}</p>
        <h1 className="display mt-6 text-4xl md:text-6xl">
          {t("order.title")} №{order.invId}
        </h1>
      </Reveal>

      <div className="mt-14 grid gap-14 md:mt-20 lg:grid-cols-5 lg:gap-20">
        {/* Status timeline */}
        <Reveal delay={0.08} amount="some" className="min-w-0 lg:col-span-3">
          {order.status === "new" && (
            <p className="mb-6 text-[13px] leading-relaxed text-muted">
              {t("order.status.new.note")}
            </p>
          )}
          <ol className="border-t hairline">
            {steps.map((step) => {
              const active = step.key === order.status;
              const date = step.reached ? fmtDate(dateFor(step.key)) : null;
              return (
                <li
                  key={step.key}
                  className="grid grid-cols-[24px_1fr_auto] items-baseline gap-x-5 border-b hairline py-7 md:py-8"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 self-center justify-self-center rounded-full border transition-colors ${
                      step.key === "cancelled"
                        ? "border-oxblood-bright bg-oxblood-bright"
                        : step.reached
                          ? "border-strong bg-strong"
                          : "hairline"
                    }`}
                  />
                  <div>
                    <p
                      className={`display text-lg tracking-[0.1em] md:text-xl ${
                        step.reached ? "" : "text-muted"
                      }`}
                    >
                      {t(`order.status.${step.key}` as DictKey)}
                    </p>
                    {active && (
                      <p className="mt-1.5 text-[13px] text-muted">
                        {t(`order.status.${step.key}.note` as DictKey)}
                      </p>
                    )}
                    {notes[step.key] && (
                      <p className="mt-2 text-[13px] leading-relaxed text-strong">
                        {notes[step.key]}
                      </p>
                    )}
                    {step.key === "shipped" && order.track && (
                      <p className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                        <span className="label label-muted">
                          {t("order.track.label")}: {order.track}
                        </span>
                        <a
                          href={`https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(order.track)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="link-quiet label"
                        >
                          {t("order.track.follow")} ↗
                        </a>
                      </p>
                    )}
                  </div>
                  <span className="text-xs tabular-nums text-muted">
                    {date}
                  </span>
                </li>
              );
            })}
          </ol>
        </Reveal>

        {/* Items */}
        <Reveal delay={0.16} amount="some" className="min-w-0 lg:col-span-2">
          <aside className="border hairline bg-porcelain p-7 md:p-8">
            <h2 className="label">{t("order.items")}</h2>
            <ul className="mt-6 divide-y divide-linen border-y hairline">
              {order.items.map((item) => {
                const product = get(item.productId);
                return (
                  <li
                    key={`${item.productId}-${item.size}`}
                    className="flex items-baseline justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium tracking-[0.01em]">
                        {product ? product.name[lang] : item.productId}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted">
                        {item.size ? `${item.size} · ` : ""}
                        {item.qty} ×
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] tabular-nums">
                      {formatPrice(
                        lang,
                        item.priceRub * item.qty,
                        (product ? product.priceUsd : Math.round(item.priceRub / 92)) *
                          item.qty,
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex items-baseline justify-between gap-4">
              <span className="label">{t("order.total")}</span>
              <span className="display text-xl tabular-nums tracking-[0.06em]">
                {formatPrice(
                  lang,
                  order.totalRub,
                  order.items.reduce((sum, item) => {
                    const product = get(item.productId);
                    return (
                      sum +
                      (product
                        ? product.priceUsd
                        : Math.round(item.priceRub / 92)) *
                        item.qty
                    );
                  }, 0),
                )}
              </span>
            </div>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
