"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatPrice, useLang } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useProducts } from "@/lib/products-context";
import { useModalBehavior } from "@/lib/use-modal";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CartDrawer() {
  const { lang, t } = useLang();

  const { get } = useProducts();
  const cart = useCart();
  const dialogRef = useModalBehavior<HTMLDivElement>(cart.isOpen, cart.close);

  useEffect(() => {
    if (!cart.isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cart.isOpen]);

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <>
          <motion.button
            type="button"
            tabIndex={-1}
            aria-label={t("nav.close")}
            className="fixed inset-0 z-50 bg-ink/45"
            onClick={cart.close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.aside
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("cart.title")}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-bone"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="flex items-center justify-between border-b hairline px-7 py-5">
              <h2 className="display text-sm tracking-[0.24em]">
                {t("cart.title")}
                <span className="text-muted"> · {cart.count}</span>
              </h2>
              <button
                type="button"
                className="label link-quiet"
                onClick={cart.close}
              >
                {t("nav.close")}
              </button>
            </div>

            {cart.lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-7 text-center">
                <p className="display text-lg tracking-[0.12em]">
                  {t("cart.empty")}
                </p>
                <p className="text-sm text-muted">{t("cart.empty.note")}</p>
                <button
                  type="button"
                  onClick={cart.close}
                  className="btn btn-onlight-outline mt-5"
                >
                  {t("cart.empty.cta")}
                </button>
              </div>
            ) : (
              <>
                <ul
                  data-lenis-prevent
                  className="flex-1 divide-y divide-linen overflow-y-auto px-7"
                >
                  {cart.lines.map((line, i) => {
                    const p = get(line.productId);
                    if (!p) return null;
                    return (
                      <motion.li
                        key={`${line.productId}-${line.size}`}
                        className="flex gap-5 py-6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: {
                            delay: 0.18 + Math.min(i, 6) * 0.05,
                            duration: 0.5,
                            ease: EASE,
                          },
                        }}
                      >
                        <div
                          className={`relative h-24 w-20 shrink-0 overflow-hidden border hairline ${
                            p.imageStyle === "cutout"
                              ? "bg-porcelain"
                              : "dark-stage"
                          }`}
                        >
                          <Image
                            src={p.image}
                            alt={p.name[lang]}
                            fill
                            sizes="80px"
                            className={
                              p.imageStyle === "cutout"
                                ? "object-contain p-1.5 mix-blend-multiply"
                                : "object-cover"
                            }
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-baseline justify-between gap-3">
                            <Link
                              href={`/product/${p.id}`}
                              onClick={cart.close}
                              className="truncate text-sm font-medium tracking-[0.01em]"
                            >
                              {p.name[lang]}
                            </Link>
                            <span className="shrink-0 text-sm tabular-nums">
                              {formatPrice(lang, p.priceRub, p.priceUsd)}
                            </span>
                          </div>
                          {line.size && (
                            <span className="mt-1 text-xs text-muted">
                              {t(
                                p.house === "forma"
                                  ? "product.volume"
                                  : "product.size",
                              )}
                              : {line.size}
                            </span>
                          )}
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div
                              className="flex items-center border hairline"
                              aria-label={t("cart.qty")}
                            >
                              <button
                                type="button"
                                className="px-3 py-1 text-sm transition-colors hover:bg-porcelain"
                                aria-label="−"
                                onClick={() =>
                                  cart.setQty(p.id, line.size, line.qty - 1)
                                }
                              >
                                −
                              </button>
                              <span className="w-7 text-center text-sm tabular-nums">
                                {line.qty}
                              </span>
                              <button
                                type="button"
                                className="px-3 py-1 text-sm transition-colors hover:bg-porcelain"
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
                      </motion.li>
                    );
                  })}
                </ul>
                <div className="border-t hairline px-7 py-6">
                  <div className="flex items-baseline justify-between">
                    <span className="label">{t("cart.subtotal")}</span>
                    <span className="display text-lg tabular-nums tracking-[0.08em]">
                      {formatPrice(lang, cart.totalRub, cart.totalUsd)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">{t("cart.note")}</p>
                  <Link
                    href="/checkout"
                    onClick={cart.close}
                    className="btn btn-primary mt-5 w-full"
                  >
                    {t("cart.checkout")}
                  </Link>
                  <button
                    type="button"
                    onClick={cart.close}
                    className="label link-quiet mx-auto mt-4 block text-muted"
                  >
                    {t("cart.continue")}
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
