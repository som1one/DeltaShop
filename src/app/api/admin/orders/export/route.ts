import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-auth";
import { adminList, type OrderStatus } from "@/lib/orders";

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Принят",
  paid: "Оплачен",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? "all";
  const orders = await adminList({
    search: params.get("search") ?? undefined,
    status: STATUSES.includes(status as OrderStatus)
      ? (status as OrderStatus)
      : "all",
    limit: 1000,
  });

  const header = [
    "Номер",
    "Создан",
    "Статус",
    "Имя",
    "Почта",
    "Телефон",
    "Регион",
    "Город",
    "Адрес",
    "Сумма, ₽",
    "Трек",
    "Состав",
  ];
  const rows = orders.map((o) => [
    o.invId,
    o.createdAt,
    STATUS_LABEL[o.status],
    o.name,
    o.email,
    o.phone,
    o.region === "cis" ? "СНГ" : "Международный",
    o.city,
    o.address,
    o.totalRub,
    o.track ?? "",
    o.items
      .map((i) => `${i.productId}${i.size ? ` (${i.size})` : ""} ×${i.qty}`)
      .join("; "),
  ]);

  /* Разделитель — точка с запятой, плюс BOM: иначе русский Excel открывает
     файл одной колонкой и ломает кириллицу. */
  const csv =
    "﻿" +
    [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") +
    "\r\n";

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
