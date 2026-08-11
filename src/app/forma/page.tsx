"use client";

import ProductCard from "@/components/ProductCard";
import { RevealGroup, RevealItem } from "@/components/Reveal";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import ComingSoonCard from "@/components/catalog/ComingSoonCard";
import HeroProductCard from "@/components/catalog/HeroProductCard";
import { comingSoon, leadSpan } from "@/lib/products";
import { useProducts } from "@/lib/products-context";

export default function FormaCataloguePage() {
  const items = useProducts().byHouse("forma");
  const [hero, ...rest] = items;
  /* Плитки «Скоро» стоят в том же ряду, поэтому считаются вместе с товарами */
  const span = leadSpan(rest.length + comingSoon.length);

  return (
    <div className="pt-28 md:pt-40">
      <section className="measure gutter pb-24 md:pb-36">
        <CatalogHeader
          subKey="catalog.forma.sub"
          titleKey="catalog.forma.title"
          count={items.length}
          introKey="home.forma.text"
        />
        <RevealGroup className="mt-14 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 md:mt-20 lg:grid-cols-3">
          {hero ? (
            <RevealItem
              key={hero.id}
              className={`${span.sm ? "sm:col-span-2" : ""} ${
                span.lg ? "lg:col-span-2" : "lg:col-span-1"
              }`}
            >
              <HeroProductCard product={hero} priority wide={span.lg} />
            </RevealItem>
          ) : null}
          {rest.map((product, i) => (
            <RevealItem key={product.id}>
              <ProductCard product={product} priority={i < 2} />
            </RevealItem>
          ))}
          {comingSoon.map((item) => (
            <RevealItem key={item.id}>
              <ComingSoonCard item={item} />
            </RevealItem>
          ))}
        </RevealGroup>
      </section>
    </div>
  );
}
