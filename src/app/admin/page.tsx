"use client";

import { useEffect, useState, type FormEvent } from "react";

type OrderStatus = "new" | "paid" | "shipped" | "delivered" | "cancelled";

type AdminOrder = {
  invId: number;
  token: string;
  status: OrderStatus;
  name: string;
  email: string;
  phone: string;
  region: "cis" | "intl";
  city: string;
  address: string;
  totalRub: number;
  items: { productId: string; size: string | null; qty: number }[];
  track: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Принят",
  paid: "Оплачен",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

/** Мини-админка заказов. Ключ — ADMIN_PASSWORD из .env.local. */
export default function AdminPage() {
  const [key, setKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("fv-admin-key");
    if (saved) setKey(saved);
  }, []);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    fetch("/api/admin/orders", { headers: { "x-admin-key": key } })
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) {
          setError(
            res.status === 503
              ? "ADMIN_PASSWORD не задан в .env.local"
              : "Неверный ключ",
          );
          setOrders(null);
          return;
        }
        setError(null);
        window.sessionStorage.setItem("fv-admin-key", key);
        const data = (await res.json()) as { orders: AdminOrder[] };
        setOrders(data.orders);
      })
      .catch(() => alive && setError("Сервер недоступен"));
    return () => {
      alive = false;
    };
  }, [key]);

  const login = (e: FormEvent) => {
    e.preventDefault();
    setKey(draftKey.trim());
  };

  const update = async (
    invId: number,
    patch: { status?: OrderStatus; track?: string | null },
  ) => {
    setSavingId(invId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ invId, ...patch }),
      });
      if (res.ok) {
        const { order } = (await res.json()) as { order: AdminOrder };
        setOrders((prev) =>
          prev
            ? prev.map((o) => (o.invId === order.invId ? { ...o, ...order } : o))
            : prev,
        );
      }
    } finally {
      setSavingId(null);
    }
  };

  if (!orders) {
    return (
      <section className="measure gutter pb-24 pt-28 md:pt-40">
        <h1 className="display text-3xl md:text-5xl">Админка</h1>
        <form onSubmit={login} className="mt-10 flex max-w-md gap-3">
          <input
            className="field"
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="Ключ администратора"
            aria-label="Ключ администратора"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Войти
          </button>
        </form>
        {error && <p className="field-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="measure gutter pb-24 pt-28 md:pt-40">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display text-3xl md:text-5xl">Заказы</h1>
        <span className="label label-muted">{orders.length} шт.</span>
      </div>

      {orders.length === 0 ? (
        <p className="mt-10 text-muted">Заказов пока нет.</p>
      ) : (
        <ul className="mt-10 border-t hairline">
          {orders.map((order) => (
            <li
              key={order.invId}
              className="grid gap-4 border-b hairline py-6 lg:grid-cols-[110px_1fr_260px_240px] lg:gap-8"
            >
              <div>
                <p className="display text-lg tabular-nums">№{order.invId}</p>
                <p className="mt-1 text-xs tabular-nums text-muted">
                  {new Date(order.createdAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 text-sm tabular-nums">
                  {order.totalRub.toLocaleString("ru-RU")} ₽
                </p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate">
                  {order.name} · {order.email} · {order.phone}
                </p>
                <p className="mt-1 truncate text-muted">
                  {order.region === "cis" ? "СНГ" : "Международный"} ·{" "}
                  {order.city}, {order.address}
                </p>
                <p className="mt-1 truncate text-xs text-muted">
                  {order.items
                    .map((i) => `${i.productId}${i.size ? ` (${i.size})` : ""} ×${i.qty}`)
                    .join(", ")}
                </p>
              </div>
              <div>
                <label className="label label-muted" htmlFor={`st-${order.invId}`}>
                  Статус
                </label>
                <select
                  id={`st-${order.invId}`}
                  className="field mt-2"
                  value={order.status}
                  disabled={savingId === order.invId}
                  onChange={(e) =>
                    update(order.invId, {
                      status: e.target.value as OrderStatus,
                    })
                  }
                >
                  {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="label label-muted"
                  htmlFor={`tr-${order.invId}`}
                >
                  Трек СДЭК
                </label>
                <input
                  id={`tr-${order.invId}`}
                  className="field mt-2"
                  defaultValue={order.track ?? ""}
                  placeholder="Номер отправления"
                  disabled={savingId === order.invId}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (order.track ?? "")) {
                      update(order.invId, { track: v === "" ? null : v });
                    }
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
