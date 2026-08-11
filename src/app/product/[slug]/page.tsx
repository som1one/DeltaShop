"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatPrice, useLang } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/products";
import { useProducts } from "@/lib/products-context";
import ProductCard from "@/components/ProductCard";
import Reveal, { RevealGroup, RevealItem } from "@/components/Reveal";
import Accordion from "@/components/catalog/Accordion";
import MediaStage from "@/components/catalog/MediaStage";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const product = useProducts().get(slug);
  if (!product) notFound();

  /* Keyed by id so size/added state resets when navigating between products */
  return <ProductView key={product.id} product={product} />;
}

function ProductView({ product }: { product: Product }) {
  const { lang, t } = useLang();
  const catalogue = useProducts();
  const cart = useCart();
  const [size, setSize] = useState<string | null>(
    product.sizes ? product.sizes[0] : null,
  );
  const [added, setAdded] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const addToCart = () => {
    cart.add(product.id, size);
    setAdded(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  };

  const houseHref = product.house === "forma" ? "/forma" : "/visual";
  const also = [
    ...catalogue.byHouse(product.house).filter((p) => p.id !== product.id),
    ...catalogue.all.filter((p) => p.house !== product.house),
  ].slice(0, 3);

  return (
    <div className="measure gutter pb-24 pt-28 md:pb-36 md:pt-40">
      <div className="grid gap-16 lg:grid-cols-2">
        {/* Media stage — deliberately not sticky: with a short info column
            the sticky bottom-stop makes the photo slide down whenever an
            accordion row expands the row height */}
        <div className="lg:self-start">
          <Reveal>
            <MediaStage product={product} />
          </Reveal>
        </div>

        {/* Info column */}
        <div className="max-w-xl">
          <Reveal delay={0.1}>
            <Link href={houseHref} className="link-quiet label label-muted">
              ← {t("product.back")}
            </Link>

            <p className="label label-muted mt-12">
              {t(product.house === "forma" ? "nav.forma" : "nav.visual")}
            </p>
            <h1 className="display mt-4 text-4xl md:text-5xl">
              {product.name[lang]}
            </h1>
            <p className="mt-4 text-muted">{product.tagline[lang]}</p>
            <p className="display mt-8 text-2xl tabular-nums">
              {formatPrice(lang, product.priceRub, product.priceUsd)}
            </p>

            {/* Size / volume */}
            <div className="mt-12">
              <span className="label label-muted">
                {t(product.house === "forma" ? "product.volume" : "product.size")}
              </span>
              {product.sizes === null ? (
                <p className="mt-3 text-sm text-muted">
                  {t("product.size.one")}
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const selected = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSize(s)}
                        className={`min-w-12 border px-3 py-3 text-sm transition-colors duration-300 ${
                          selected
                            ? "border-ink bg-ink text-ondark"
                            : "hairline hover:border-strong"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary mt-10 w-full"
              onClick={addToCart}
            >
              {added ? t("product.added") : t("product.add")}
            </button>

            <Accordion
              className="mt-14"
              items={[
                {
                  id: "details",
                  title: t("product.details"),
                  body: product.description[lang],
                },
                {
                  id: "composition",
                  title: t("product.composition"),
                  body: product.composition[lang],
                },
                {
                  id: "shipping",
                  title: t("product.shipping"),
                  body: t("product.shipping.text"),
                },
              ]}
            />
          </Reveal>
        </div>
      </div>

      {/* You may also like */}
      {also.length > 0 && (
        <section className="mt-24 md:mt-36">
          <Reveal>
            <h2 className="display text-2xl md:text-3xl">
              {t("product.also")}
            </h2>
          </Reveal>
          <RevealGroup className="mt-10 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 xl:grid-cols-3">
            {also.map((p) => (
              <RevealItem key={p.id}>
                <ProductCard product={p} />
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
      )}
    </div>
  );
}
