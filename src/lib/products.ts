export type House = "visual" | "forma";

export type Product = {
  id: string;
  house: House;
  name: { ru: string; en: string };
  tagline: { ru: string; en: string };
  description: { ru: string; en: string };
  composition: { ru: string; en: string };
  priceRub: number;
  priceUsd: number;
  image: string;
  /** Options: clothing sizes or cosmetic volume; null → one size */
  sizes: string[] | null;
  /** Path to the AI-model video when supplied, e.g. "/videos/cap-drape.mp4" */
  video: string | null;
  featured: boolean;
  /** "cutout" — white-background shot blended onto porcelain; "cover" — full-bleed photo */
  imageStyle: "cutout" | "cover";
};

/**
 * Types and pure selectors only — no data. The catalogue lives in Postgres
 * (see products-store.ts on the server, products-context.tsx on the client),
 * so this module stays safe to import from either side.
 */

export function findProduct(
  list: Product[],
  id: string,
): Product | undefined {
  return list.find((p) => p.id === id);
}

export function byHouse(list: Product[], house: House): Product[] {
  return list.filter((p) => p.house === house);
}

export function featured(list: Product[]): Product[] {
  return list.filter((p) => p.featured);
}

/**
 * Ведущая карточка каталога занимает две колонки — но только тогда, когда
 * от этого ряды закрываются целиком. Каталог правится из админки, число
 * позиций произвольное, поэтому ширина выбирается по счёту, а не намертво.
 *
 * `tiles` — сколько обычных плиток стоит рядом с ведущей.
 */
export function leadSpan(tiles: number): { sm: boolean; lg: boolean } {
  const withWideLead = tiles + 2;
  return {
    sm: withWideLead % 2 === 0,
    lg: withWideLead % 3 === 0,
  };
}

/** FORMA slots that are announced but not yet released */
export const comingSoon: {
  id: string;
  name: { ru: string; en: string };
  tagline: { ru: string; en: string };
}[] = [
  {
    id: "forma-cream",
    name: { ru: "Крем Visage 02", en: "Visage Cream 02" },
    tagline: { ru: "Барьерный крем", en: "Barrier cream" },
  },
  {
    id: "forma-cleanser",
    name: { ru: "Гель Visage 03", en: "Visage Cleanser 03" },
    tagline: { ru: "Мягкое очищение", en: "Gentle cleanse" },
  },
];
