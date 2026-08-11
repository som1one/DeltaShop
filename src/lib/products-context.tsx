"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  byHouse,
  featured,
  findProduct,
  type House,
  type Product,
} from "./products";

/**
 * Каталог, отданный сервером в корневом layout. Витрина, корзина и карточка
 * товара — клиентские компоненты, поэтому список приходит один раз через
 * контекст, а не подгружается запросами с каждой страницы.
 */

type ProductsValue = {
  all: Product[];
  get: (id: string) => Product | undefined;
  byHouse: (house: House) => Product[];
  featured: () => Product[];
};

const ProductsContext = createContext<ProductsValue | null>(null);

export function ProductsProvider({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  const value = useMemo<ProductsValue>(
    () => ({
      all: products,
      get: (id) => findProduct(products, id),
      byHouse: (house) => byHouse(products, house),
      featured: () => featured(products),
    }),
    [products],
  );
  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): ProductsValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error("useProducts must be used inside ProductsProvider");
  }
  return ctx;
}
