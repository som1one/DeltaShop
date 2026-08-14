"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatPrice, useLang } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { useProducts } from "@/lib/products-context";
import Reveal from "@/components/Reveal";
import EmptyCart from "@/components/checkout/EmptyCart";
import OptionCard from "@/components/checkout/OptionCard";

const EASE = [0.22, 1, 0.36, 1] as const;

type Region = "cis" | "intl";
/* Почта не в форме: заказ пишется на адрес учётной записи */
type FieldName = "name" | "phone" | "city" | "address";

const FORM_ID = "checkout-form";

export default function CheckoutPage() {
  const { lang, t } = useLang();

  const { get } = useProducts();
  const cart = useCart();
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const [region, setRegion] = useState<Region>("cis");
  const [done, setDone] = useState(false);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [orderInvId, setOrderInvId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payFailed, setPayFailed] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  const clearError = (n: FieldName) =>
    setErrors((prev) => (prev[n] ? { ...prev, [n]: undefined } : prev));


  /* Custom validation — the native browser bubble is replaced by quiet
     inline messages under the fields */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const value = (n: string) =>
      (form.elements.namedItem(n) as HTMLInputElement | null)?.value.trim() ??
      "";
    const next: Partial<Record<FieldName, string>> = {};
    if (!value("name")) next.name = t("form.required");
    const phone = value("phone");
    if (!phone) next.phone = t("form.required");
    else if ((phone.match(/\d/g) ?? []).length < 7)
      next.phone = t("form.phone");
    if (!value("city")) next.city = t("form.required");
    if (!value("address")) next.address = t("form.required");
    setErrors(next);
    const first = (Object.keys(next) as FieldName[]).find((k) => next[k]);
    if (first) {
      (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
      return;
    }

    /* ЮKassa: сервер создаёт заказ и платёж, мы уходим на его страницу.
       Пока ключи не настроены (или сеть недоступна) — демо-экран успеха. */
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.lines,
          name: value("name"),
          phone: value("phone"),
          region,
          city: value("city"),
          address: value("address"),
          culture: lang,
        }),
      });
      /* Сессия истекла между открытием чекаута и отправкой — заказа нет,
         поэтому не рисуем «принят», а возвращаем на вход с корзиной. */
      if (res.status === 401) {
        window.location.href = "/login?next=/checkout";
        return;
      }
      /* Приём оплаты не настроен: денег не было, и «заказ принят» тут будет
         враньём — говорим прямо и оставляем корзину нетронутой. */
      if (res.status === 503) {
        setPayFailed(true);
        setSubmitting(false);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as {
          url?: string;
          token?: string;
          invId?: number;
        };
        if (data.token) {
          setOrderToken(data.token);
          if (data.invId) setOrderInvId(data.invId);
          window.localStorage.setItem(
            "fv-last-order",
            JSON.stringify({ token: data.token, invId: data.invId ?? null }),
          );
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
    } catch {
      /* сеть недоступна — показываем экран принятого заказа без ссылки */
    }
    setSubmitting(false);
    setDone(true);
    cart.clear();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  if (!done && cart.lines.length === 0) {
    return (
      <section className="measure gutter pt-28 pb-24 md:pt-40 md:pb-36">
        <EmptyCart />
      </section>
    );
  }

  /* Заказ оформляется только из учётной записи: так он остаётся в кабинете,
     а почта заказа заведомо принадлежит покупателю. Корзина не трогается. */
  if (!done && !user) {
    return (
      <section className="measure gutter pt-28 pb-24 md:pt-40 md:pb-36">
        <Reveal>
          <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center text-center">
            <h1 className="display text-3xl md:text-4xl">
              {t("checkout.auth.title")}
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              {t("checkout.auth.note")}
            </p>
            <Link href="/login?next=/checkout" className="btn btn-primary mt-9">
              {t("checkout.auth.cta")}
            </Link>
            <Link href="/cart" className="link-quiet label mt-6">
              {t("cart.title")}
            </Link>
          </div>
        </Reveal>
      </section>
    );
  }

  return (
    <section className="measure gutter pt-28 pb-24 md:pt-40 md:pb-36">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.8, ease: EASE },
            }}
            className="flex min-h-[52vh] flex-col items-center justify-center text-center"
          >
            {/* The real print mark, inverted to charcoal so it reads on bone */}
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
                <Link
                  href={`/order/${orderToken}`}
                  className="btn btn-primary"
                >
                  {t("order.track.cta")}
                </Link>
              )}
              <Link href="/" className="btn btn-onlight-outline">
                {t("checkout.done.back")}
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.3 } }
                : {
                    opacity: 0,
                    y: -16,
                    transition: { duration: 0.5, ease: EASE },
                  }
            }
          >
            <Reveal>
              <h1 className="display text-3xl md:text-5xl">
                {t("checkout.title")}
              </h1>
            </Reveal>

            <div className="mt-10 grid gap-14 md:mt-14 lg:grid-cols-5 lg:gap-20">
              {/* Form — three numbered groups */}
              <Reveal delay={0.08} amount="some" className="min-w-0 lg:col-span-3">
                <form id={FORM_ID} onSubmit={onSubmit} noValidate>
                  {/* 01 — Contact */}
                  <div className="grid gap-y-5 border-t hairline py-9 md:grid-cols-[72px_1fr] md:py-12">
                    <span className="label label-muted tabular-nums">01</span>
                    <div>
                      <h2 className="label">{t("checkout.step.contact")}</h2>
                      <div className="mt-6 grid gap-4">
                        <div>
                          <label className="sr-only" htmlFor="co-name">
                            {t("checkout.name")}
                          </label>
                          <input
                            id="co-name"
                            className={`field ${errors.name ? "field-invalid" : ""}`}
                            type="text"
                            name="name"
                            required
                            defaultValue={user?.name ?? ""}
                            autoComplete="name"
                            placeholder={t("checkout.name")}
                            aria-invalid={errors.name ? true : undefined}
                            aria-describedby={errors.name ? "err-co-name" : undefined}
                            onChange={() => clearError("name")}
                          />
                          {errors.name && (
                            <p id="err-co-name" className="field-error">
                              {errors.name}
                            </p>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Почта не редактируется: заказ и чек уходят на
                              адрес учётной записи */}
                          <div>
                            <p className="field flex items-center bg-porcelain text-muted">
                              <span className="truncate">{user?.email}</span>
                            </p>
                            <p className="mt-2 text-xs text-muted">
                              {t("checkout.account.email")}
                            </p>
                          </div>
                          <div>
                            <label className="sr-only" htmlFor="co-phone">
                              {t("checkout.phone")}
                            </label>
                            <input
                              id="co-phone"
                              className={`field ${errors.phone ? "field-invalid" : ""}`}
                              type="tel"
                              name="phone"
                              required
                              defaultValue={user?.phone ?? ""}
                              autoComplete="tel"
                              placeholder={t("checkout.phone")}
                              aria-invalid={errors.phone ? true : undefined}
                              aria-describedby={errors.phone ? "err-co-phone" : undefined}
                              onChange={() => clearError("phone")}
                            />
                            {errors.phone && (
                              <p id="err-co-phone" className="field-error">
                                {errors.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 02 — Delivery */}
                  <div className="grid gap-y-5 border-t hairline py-9 md:grid-cols-[72px_1fr] md:py-12">
                    <span className="label label-muted tabular-nums">02</span>
                    <div>
                      <h2 className="label">{t("checkout.step.delivery")}</h2>
                      <fieldset className="mt-6">
                        <legend className="label label-muted">
                          {t("checkout.region.title")}
                        </legend>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <OptionCard
                            name="region"
                            value="cis"
                            checked={region === "cis"}
                            onSelect={() => setRegion("cis")}
                            title={t("checkout.region.cis")}
                            note={t("checkout.region.cis.note")}
                          />
                          <OptionCard
                            name="region"
                            value="intl"
                            checked={region === "intl"}
                            onSelect={() => setRegion("intl")}
                            title={t("checkout.region.intl")}
                            note={t("checkout.region.intl.note")}
                          />
                        </div>
                      </fieldset>
                      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1.6fr]">
                        <div>
                          <label className="sr-only" htmlFor="co-city">
                            {t("checkout.city")}
                          </label>
                          <input
                            id="co-city"
                            className={`field ${errors.city ? "field-invalid" : ""}`}
                            type="text"
                            name="city"
                            required
                            defaultValue={user?.city ?? ""}
                            autoComplete="address-level2"
                            placeholder={t("checkout.city")}
                            aria-invalid={errors.city ? true : undefined}
                            aria-describedby={errors.city ? "err-co-city" : undefined}
                            onChange={() => clearError("city")}
                          />
                          {errors.city && (
                            <p id="err-co-city" className="field-error">
                              {errors.city}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="sr-only" htmlFor="co-address">
                            {t("checkout.address")}
                          </label>
                          <input
                            id="co-address"
                            className={`field ${errors.address ? "field-invalid" : ""}`}
                            type="text"
                            name="address"
                            required
                            defaultValue={user?.address ?? ""}
                            autoComplete="street-address"
                            placeholder={t("checkout.address")}
                            aria-invalid={errors.address ? true : undefined}
                            aria-describedby={errors.address ? "err-co-address" : undefined}
                            onChange={() => clearError("address")}
                          />
                          {errors.address && (
                            <p id="err-co-address" className="field-error">
                              {errors.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 03 — Payment */}
                  <div className="grid gap-y-5 border-y hairline py-9 md:grid-cols-[72px_1fr] md:py-12">
                    <span className="label label-muted tabular-nums">03</span>
                    <div>
                      <h2 className="label">{t("checkout.step.payment")}</h2>
                      <div className="mt-6 flex flex-col gap-2 border hairline bg-porcelain p-5 md:p-6">
                        <span className="label">
                          {t("checkout.payment.provider")}
                        </span>
                        <span className="text-xs leading-relaxed text-muted">
                          {t("checkout.payment.provider.note")}
                        </span>
                      </div>
                    </div>
                  </div>
                </form>
              </Reveal>

              {/* Order summary */}
              <Reveal delay={0.16} amount="some" className="min-w-0 lg:col-span-2">
                <aside className="border hairline bg-porcelain p-7 md:p-8 lg:sticky lg:top-28">
                  <h2 className="label">{t("checkout.summary")}</h2>
                  <ul className="mt-6 divide-y divide-linen border-y hairline">
                    {cart.lines.map((line) => {
                      const p = get(line.productId);
                      if (!p) return null;
                      const cutout = p.imageStyle === "cutout";
                      return (
                        <li
                          key={`${line.productId}-${line.size}`}
                          className="flex items-center gap-4 py-4"
                        >
                          <div
                            className={`relative aspect-[4/5] w-12 shrink-0 overflow-hidden border hairline ${
                              cutout ? "bg-porcelain" : "dark-stage"
                            }`}
                          >
                            <Image
                              src={p.image}
                              alt={p.name[lang]}
                              fill
                              sizes="48px"
                              className={
                                cutout
                                  ? "object-contain p-1 mix-blend-multiply"
                                  : "object-cover"
                              }
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium tracking-[0.01em]">
                              {p.name[lang]}
                            </p>
                            <p className="mt-0.5 text-xs tabular-nums text-muted">
                              {line.size ? `${line.size} · ` : ""}× {line.qty}
                            </p>
                          </div>
                          <span className="shrink-0 text-[13px] tabular-nums">
                            {formatPrice(
                              lang,
                              p.priceRub * line.qty,
                              p.priceUsd * line.qty,
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-6 flex items-baseline justify-between gap-4">
                    <span className="label">{t("cart.subtotal")}</span>
                    <span className="display text-xl tabular-nums tracking-[0.06em] md:text-2xl">
                      {formatPrice(lang, cart.totalRub, cart.totalUsd)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {t("checkout.delivery.free")}
                  </p>
                  <button
                    type="submit"
                    form={FORM_ID}
                    disabled={submitting}
                    aria-busy={submitting}
                    className="btn btn-primary mt-7 w-full disabled:cursor-wait disabled:opacity-60"
                  >
                    {t("checkout.pay")}
                  </button>
                  {payFailed && (
                    <p className="field-error mt-4" role="alert">
                      {t("checkout.unavailable")}
                    </p>
                  )}
                  {/* Акцепт оферты — договор считается заключённым с оплаты,
                      поэтому согласие стоит ровно у кнопки */}
                  <p className="mt-4 text-xs leading-relaxed text-muted">
                    {t("checkout.consent")}{" "}
                    <Link href="/offer" className="link-quiet">
                      {t("legal.offer.short")}
                    </Link>{" "}
                    {t("legal.and")}{" "}
                    <Link href="/privacy" className="link-quiet">
                      {t("legal.privacy.short")}
                    </Link>
                    .
                  </p>
                </aside>
              </Reveal>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
