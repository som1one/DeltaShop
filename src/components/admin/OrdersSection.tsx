"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, AdminError } from "@/lib/admin-client";

type OrderStatus =
  | "new"
  | "paid"
  | "accepted"
  | "shipped"
  | "delivered"
  | "cancelled";

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
  stageNotes?: Record<string, string>;
  createdAt: string;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Ждёт оплаты",
  paid: "Оплачен",
  accepted: "Принят",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

/* Этапы, которые видит покупатель на странице заказа: к каждому можно
   приписать строку — например, адрес пункта выдачи на «Доставлен». */
const STAGES: OrderStatus[] = [
  "paid",
  "accepted",
  "shipped",
  "delivered",
  "cancelled",
];

export default function OrdersSection({ adminKey }: { adminKey: string }) {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const query = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    return params.toString();
  }, [search, status]);

  const load = useCallback(async () => {
    try {
      const { orders } = await adminFetch<{ orders: AdminOrder[] }>(
        adminKey,
        `/api/admin/orders?${query()}`,
      );
      setOrders(orders);
      setError(null);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось загрузить");
    }
  }, [adminKey, query]);

  /* Поиск набирают по букве — ждём паузу, чтобы не дёргать базу на каждый знак */
  useEffect(() => {
    const id = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(id);
  }, [load]);

  const update = async (
    invId: number,
    patch: {
      status?: OrderStatus;
      track?: string | null;
      stage?: OrderStatus;
      note?: string | null;
    },
  ) => {
    setSavingId(invId);
    try {
      const { order } = await adminFetch<{ order: AdminOrder }>(
        adminKey,
        "/api/admin/orders",
        { method: "PATCH", body: JSON.stringify({ invId, ...patch }) },
      );
      setOrders((prev) =>
        prev ? prev.map((o) => (o.invId === order.invId ? order : o)) : prev,
      );
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось сохранить");
    } finally {
      setSavingId(null);
    }
  };

  /* Выгрузка идёт с тем же ключом, поэтому тянем файл вручную и отдаём
     как blob: обычная ссылка не умеет проставить заголовок с ключом. */
  const exportCsv = async () => {
    try {
      const res = await fetch(`/api/admin/orders/export?${query()}`, {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Не удалось выгрузить CSV");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-52 flex-1">
          <span className="label label-muted block">Поиск</span>
          <input
            className="field mt-2 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="номер, почта, имя, город или трек"
          />
        </label>
        <label>
          <span className="label label-muted block">Статус</span>
          <select
            className="field mt-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
          >
            <option value="all">Все</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="hairline border px-4 py-3 text-xs"
          onClick={exportCsv}
        >
          Выгрузить CSV
        </button>
      </div>

      {error && (
        <p className="field-error mt-6" role="alert">
          {error}
        </p>
      )}

      <p className="label label-muted mt-8">
        {orders ? `${orders.length} шт.` : "Загружаем…"}
      </p>

      {orders && orders.length === 0 && (
        <p className="mt-6 text-muted">
          {search || status !== "all"
            ? "Ничего не нашлось."
            : "Заказов пока нет."}
        </p>
      )}

      {orders && orders.length > 0 && (
        <ul className="mt-4 border-t hairline">
          {orders.map((order) => (
            <li key={order.invId} className="border-b hairline py-6">
              <div className="grid gap-4 lg:grid-cols-[110px_1fr_240px_220px] lg:gap-8">
                <div>
                  <button
                    type="button"
                    className="display text-lg tabular-nums link-quiet"
                    onClick={() =>
                      setOpenId(openId === order.invId ? null : order.invId)
                    }
                    aria-expanded={openId === order.invId}
                  >
                    №{order.invId}
                  </button>
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
                      .map(
                        (i) =>
                          `${i.productId}${i.size ? ` (${i.size})` : ""} ×${i.qty}`,
                      )
                      .join(", ")}
                  </p>
                </div>

                <div>
                  <label className="label label-muted block">Статус</label>
                  <select
                    className="field mt-2 w-full"
                    value={order.status}
                    disabled={savingId === order.invId}
                    onChange={(e) =>
                      update(order.invId, {
                        status: e.target.value as OrderStatus,
                      })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label label-muted block">Трек СДЭК</label>
                  <input
                    className="field mt-2 w-full"
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
              </div>

              {openId === order.invId && (
                <div className="mt-5 border-t hairline pt-5 text-sm">
                  <ul className="grid gap-1">
                    {order.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-6">
                        <span>
                          {i.productId}
                          {i.size ? ` · ${i.size}` : ""}
                        </span>
                        <span className="tabular-nums text-muted">×{i.qty}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <p className="label label-muted">Комментарии к этапам</p>
                    <p className="mt-1 text-xs text-muted">
                      Покупатель видит их на странице заказа под нужным этапом.
                    </p>
                    <div className="mt-4 grid gap-3">
                      {STAGES.map((stage) => (
                        <label
                          key={stage}
                          className="grid grid-cols-[128px_1fr] items-center gap-3"
                        >
                          <span className="text-xs text-muted">
                            {STATUS_LABEL[stage]}
                          </span>
                          <input
                            className="field w-full text-xs"
                            defaultValue={order.stageNotes?.[stage] ?? ""}
                            placeholder={
                              stage === "delivered"
                                ? "например: в пункте выдачи СДЭК, ул. Ленина 5"
                                : "необязательно"
                            }
                            disabled={savingId === order.invId}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== (order.stageNotes?.[stage] ?? "")) {
                                update(order.invId, {
                                  stage,
                                  note: v === "" ? null : v,
                                });
                              }
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                    <a
                      className="link-quiet"
                      href={`/order/${order.token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Страница заказа у покупателя ↗
                    </a>
                    {order.track && (
                      <a
                        className="link-quiet"
                        href={`https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(order.track)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Отследить в СДЭК ↗
                      </a>
                    )}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
