"use client";

import { useEffect, useState, type FormEvent } from "react";
import { adminFetch, AdminError } from "@/lib/admin-client";
import OrdersSection from "@/components/admin/OrdersSection";
import PartnersSection from "@/components/admin/PartnersSection";
import ProductsSection from "@/components/admin/ProductsSection";

type Tab = "products" | "orders" | "partners";

const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "Товары" },
  { id: "orders", label: "Заказы" },
  { id: "partners", label: "Партнёры" },
];

const STORAGE_KEY = "fv-admin-key";

/**
 * Кабинет: товары, заказы, заявки партнёров.
 * Вход — тот же ключ ADMIN_PASSWORD в заголовке X-Admin-Key; ключ живёт
 * в sessionStorage и уходит при закрытии вкладки.
 */
export default function AdminPage() {
  const [key, setKey] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState("");
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("products");

  /* Проверяем сохранённый ключ до отрисовки разделов, иначе каждый из них
     стартует с собственной ошибки «неверный ключ». */
  useEffect(() => {
    let alive = true;
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    const verify = saved
      ? adminFetch(saved, "/api/admin/session").then(() => saved)
      : Promise.resolve(null);
    verify
      .then((valid) => {
        if (alive && valid) setKey(valid);
      })
      .catch(() => window.sessionStorage.removeItem(STORAGE_KEY))
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    const candidate = draftKey.trim();
    if (!candidate) return;
    setError(null);
    try {
      await adminFetch(candidate, "/api/admin/session");
      window.sessionStorage.setItem(STORAGE_KEY, candidate);
      setKey(candidate);
      setDraftKey("");
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось войти");
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setKey(null);
  };

  if (checking) {
    return (
      <section className="measure gutter pb-24 pt-28 md:pt-40">
        <p className="label label-muted">Проверяем доступ…</p>
      </section>
    );
  }

  if (!key) {
    return (
      <section className="measure gutter pb-24 pt-28 md:pt-40">
        <h1 className="display text-3xl md:text-5xl">Кабинет</h1>
        <form onSubmit={login} className="mt-10 flex max-w-md gap-3">
          <input
            className="field"
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="Ключ администратора"
            aria-label="Ключ администратора"
            autoComplete="current-password"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Войти
          </button>
        </form>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="measure gutter pb-24 pt-28 md:pt-40">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display text-3xl md:text-5xl">Кабинет</h1>
        <button type="button" className="label link-quiet" onClick={logout}>
          Выйти
        </button>
      </div>

      <nav className="mt-10 flex gap-6 border-b hairline" aria-label="Разделы">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
            className={`label -mb-px border-b-2 pb-3 transition-colors ${
              tab === item.id
                ? "border-(--ink) text-strong"
                : "border-transparent text-muted hover:text-strong"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-10">
        {tab === "products" && <ProductsSection adminKey={key} />}
        {tab === "orders" && <OrdersSection adminKey={key} />}
        {tab === "partners" && <PartnersSection adminKey={key} />}
      </div>
    </section>
  );
}
