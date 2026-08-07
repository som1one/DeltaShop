"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice, plural, useLang } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { getProduct } from "@/lib/products";
import Reveal from "@/components/Reveal";
import EmptyCart from "@/components/checkout/EmptyCart";

/** /cart — a roomier mirror of the drawer. */
export default function CartPage() {
  const { lang, t } = useLang();
  const cart = useCart();

  if (cart.lines.length === 0) {
    return (
      <section className="measure gutter pt-28 pb-24 md:pt-40 md:pb-36">
        <EmptyCart />
      </section>
    );
  }

  return (
    <section className="measure gutter pt-28 pb-24 md:pt-40 md:pb-36">
      <Reveal>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <h1 className="display text-3xl md:text-5xl">{t("cart.title")}</h1>
          <span className="label label-muted">
            {cart.count}{" "}
            {plural(lang, cart.count, {
              one: t("catalog.items.one"),
              few: t("catalog.items.few"),
              many: t("catalog.items.many"),
            })}
          </span>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-14 md:mt-14 lg:grid-cols-5 lg:gap-20">
        {/* Lines */}
        <Reveal delay={0.08} amount="some" className="min-w-0 lg:col-span-3">
          <ul className="divide-y divide-linen border-t hairline">
            {cart.lines.map((line) => {
              const p = getProduct(line.productId);
              if (!p) return null;
              const cutout = p.imageStyle === "cutout";
              return (
                <li
                  key={`${line.productId}-${line.size}`}
                  className="flex gap-4 py-8 sm:gap-6 md:gap-9 md:py-10"
                >
                  <Link
                    href={`/product/${p.id}`}
                    tabIndex={-1}
                    aria-hidden="true"
                    className={`relative block aspect-[4/5] w-16 shrink-0 overflow-hidden border hairline sm:w-24 md:w-28 ${
                      cutout ? "bg-porcelain" : "dark-stage"
                    }`}
                  >
                    <Image
                      src={p.image}
                      alt={p.name[lang]}
                      fill
                      sizes="112px"
                      className={
                        cutout
                          ? "object-contain p-[9%] mix-blend-multiply"
                          : "object-cover"
                      }
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-baseline justify-between gap-4">
                      <Link
                        href={`/product/${p.id}`}
                        className="truncate text-sm font-medium tracking-[0.01em] md:text-[15px]"
                      >
                        {p.name[lang]}
                      </Link>
                      <span className="shrink-0 text-sm tabular-nums md:text-base">
                        {formatPrice(
                          lang,
                          p.priceRub * line.qty,
                          p.priceUsd * line.qty,
                        )}
                      </span>
                    </div>
                    <span className="mt-1.5 text-xs text-muted md:text-[13px]">
                      {line.size
                        ? `${t(
                            p.house === "forma"
                              ? "product.volume"
                              : "product.size",
                          )}: ${line.size}`
                        : t("product.size.one")}
                    </span>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-y-3 pt-4">
                      <div
                        role="group"
                        aria-label={t("cart.qty")}
                        className="flex items-center border hairline"
                      >
                        <button
                          type="button"
                          className="px-3 py-1.5 text-sm transition-colors hover:bg-porcelain sm:px-4"
                          aria-label="−"
                          onClick={() =>
                            cart.setQty(p.id, line.size, line.qty - 1)
                          }
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums sm:w-9">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-sm transition-colors hover:bg-porcelain sm:px-4"
                          aria-label="+"
                          onClick={() =>
                            cart.setQty(p.id, line.size, line.qty + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="label link-quiet text-muted"
                        onClick={() => cart.remove(p.id, line.size)}
                      >
                        {t("cart.remove")}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>

        {/* Summary */}
        <Reveal delay={0.16} amount="some" className="min-w-0 lg:col-span-2">
          <aside className="border hairline bg-porcelain p-7 md:p-9 lg:sticky lg:top-28">
            <div className="flex items-baseline justify-between gap-4">
              <span className="label">{t("cart.subtotal")}</span>
              <span className="display text-2xl tabular-nums tracking-[0.06em]">
                {formatPrice(lang, cart.totalRub, cart.totalUsd)}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted">{t("cart.note")}</p>
            <Link href="/checkout" className="btn btn-primary mt-7 w-full">
              {t("cart.checkout")}
            </Link>
            <Link
              href="/visual"
              className="label link-quiet mx-auto mt-6 block w-fit text-muted"
            >
              {t("cart.continue")}
            </Link>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
