"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProduct, type Product } from "./products";

export type CartLine = {
  productId: string;
  size: string | null;
  qty: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  totalRub: number;
  totalUsd: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (productId: string, size: string | null) => void;
  remove: (productId: string, size: string | null) => void;
  setQty: (productId: string, size: string | null, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "fv-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        setLines(parsed.filter((l) => getProduct(l.productId)));
      }
    } catch {
      /* corrupted storage — start empty */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    }
  }, [lines, hydrated]);

  const add = useCallback((productId: string, size: string | null) => {
    setLines((prev) => {
      const hit = prev.find(
        (l) => l.productId === productId && l.size === size,
      );
      if (hit) {
        return prev.map((l) =>
          l === hit ? { ...l, qty: Math.min(l.qty + 1, 9) } : l,
        );
      }
      return [...prev, { productId, size, qty: 1 }];
    });
    setIsOpen(true);
  }, []);

  const remove = useCallback((productId: string, size: string | null) => {
    setLines((prev) =>
      prev.filter((l) => !(l.productId === productId && l.size === size)),
    );
  }, []);

  const setQty = useCallback(
    (productId: string, size: string | null, qty: number) => {
      if (qty < 1) {
        remove(productId, size);
        return;
      }
      setLines((prev) =>
        prev.map((l) =>
          l.productId === productId && l.size === size
            ? { ...l, qty: Math.min(qty, 9) }
            : l,
        ),
      );
    },
    [remove],
  );

  const clear = useCallback(() => setLines([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const { count, totalRub, totalUsd } = useMemo(() => {
    let count = 0;
    let totalRub = 0;
    let totalUsd = 0;
    for (const l of lines) {
      const p: Product | undefined = getProduct(l.productId);
      if (!p) continue;
      count += l.qty;
      totalRub += p.priceRub * l.qty;
      totalUsd += p.priceUsd * l.qty;
    }
    return { count, totalRub, totalUsd };
  }, [lines]);

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        totalRub,
        totalUsd,
        isOpen,
        open,
        close,
        add,
        remove,
        setQty,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
