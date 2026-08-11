"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { adminFetch, AdminError } from "@/lib/admin-client";
import type { Product } from "@/lib/products";
import ProductForm from "./ProductForm";

const HOUSE_LABEL: Record<Product["house"], string> = {
  visual: "VISUAL",
  forma: "FORMA",
};

export default function ProductsSection({ adminKey }: { adminKey: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const { products } = await adminFetch<{ products: Product[] }>(
        adminKey,
        "/api/admin/products",
      );
      setProducts(products);
      setError(null);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось загрузить");
    }
  };

  useEffect(() => {
    let alive = true;
    adminFetch<{ products: Product[] }>(adminKey, "/api/admin/products")
      .then((data) => {
        if (!alive) return;
        setProducts(data.products);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof AdminError ? e.message : "Не удалось загрузить");
      });
    return () => {
      alive = false;
    };
  }, [adminKey]);

  const move = async (id: string, direction: "up" | "down") => {
    setBusyId(id);
    try {
      const { products } = await adminFetch<{ products: Product[] }>(
        adminKey,
        "/api/admin/products",
        { method: "PATCH", body: JSON.stringify({ id, move: direction }) },
      );
      setProducts(products);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось переставить");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (product: Product) => {
    const ok = window.confirm(
      `Удалить «${product.name.ru}»? Товар исчезнет из каталога.\n` +
        `В уже оформленных заказах он останется как есть.`,
    );
    if (!ok) return;
    setBusyId(product.id);
    try {
      await adminFetch(
        adminKey,
        `/api/admin/products?id=${encodeURIComponent(product.id)}`,
        { method: "DELETE" },
      );
      await load();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось удалить");
    } finally {
      setBusyId(null);
    }
  };

  if (editing !== undefined) {
    return (
      <ProductForm
        adminKey={adminKey}
        initial={editing}
        onCancel={() => setEditing(undefined)}
        onSaved={(next) => {
          setProducts(next);
          setEditing(undefined);
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="label label-muted">
          {products ? `${products.length} позиций` : "Загружаем…"}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditing(null)}
        >
          Добавить товар
        </button>
      </div>

      {error && (
        <p className="field-error mt-6" role="alert">
          {error}
        </p>
      )}

      {products && products.length === 0 && (
        <p className="mt-10 text-muted">Каталог пуст.</p>
      )}

      {products && products.length > 0 && (
        <ul className="mt-8 border-t hairline">
          {products.map((p, i) => (
            <li
              key={p.id}
              className="grid grid-cols-[64px_1fr] items-start gap-4 border-b hairline py-5 md:grid-cols-[64px_1fr_auto] md:gap-6"
            >
              <div className="bg-porcelain hairline relative aspect-[4/5] overflow-hidden border">
                <Image
                  src={p.image}
                  alt=""
                  fill
                  sizes="64px"
                  className={
                    p.imageStyle === "cutout"
                      ? "object-contain p-[8%] mix-blend-multiply"
                      : "object-cover"
                  }
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="display text-sm tracking-[0.14em]">
                    {p.name.ru}
                  </h3>
                  <span className="label label-muted">
                    {HOUSE_LABEL[p.house]}
                  </span>
                  {p.featured && (
                    <span className="label text-[10px] text-strong">
                      в витрине
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[13px] text-muted">
                  {p.tagline.ru}
                </p>
                <p className="mt-1 text-sm tabular-nums">
                  {p.priceRub.toLocaleString("ru-RU")} ₽
                  <span className="ml-3 text-xs text-muted">
                    {p.sizes ? p.sizes.join(" · ") : "один размер"}
                  </span>
                </p>
              </div>

              <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
                <button
                  type="button"
                  className="hairline border px-3 py-2 text-xs disabled:opacity-40"
                  disabled={i === 0 || busyId === p.id}
                  onClick={() => move(p.id, "up")}
                  aria-label={`Поднять ${p.name.ru}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="hairline border px-3 py-2 text-xs disabled:opacity-40"
                  disabled={i === products.length - 1 || busyId === p.id}
                  onClick={() => move(p.id, "down")}
                  aria-label={`Опустить ${p.name.ru}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="hairline border px-4 py-2 text-xs"
                  onClick={() => setEditing(p)}
                >
                  Править
                </button>
                <button
                  type="button"
                  className="hairline border px-4 py-2 text-xs text-(--oxblood) disabled:opacity-40"
                  disabled={busyId === p.id}
                  onClick={() => remove(p)}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
