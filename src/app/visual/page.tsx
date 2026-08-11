"use client";

import ProductCard from "@/components/ProductCard";
import { RevealGroup, RevealItem } from "@/components/Reveal";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import HeroProductCard from "@/components/catalog/HeroProductCard";
import { leadSpan } from "@/lib/products";
import { useProducts } from "@/lib/products-context";

export default function VisualCataloguePage() {
  const items = useProducts().byHouse("visual");
  const [hero, ...rest] = items;
  const span = leadSpan(rest.length);

  return (
    <div className="pt-28 md:pt-40">
      <section className="measure gutter pb-24 md:pb-36">
        <CatalogHeader
          subKey="catalog.visual.sub"
          titleKey="catalog.visual.title"
          count={items.length}
          introKey="home.visual.text"
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
        </RevealGroup>
      </section>
    </div>
  );
}
