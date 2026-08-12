import "server-only";
import { randomUUID } from "crypto";

/**
 * ЮKassa (https://yookassa.ru/developers/api).
 *
 * Конфигурация через переменные окружения:
 *   YOOKASSA_SHOP_ID     — идентификатор магазина
 *   YOOKASSA_SECRET_KEY  — секретный ключ (live_… — боевой, test_… — тестовый)
 *
 * Пока ключи не заданы, isConfigured() == false и чекаут работает
 * в демо-режиме без реального списания.
 *
 * Чек передаём всегда: на магазине включена фискализация, и без receipt
 * ЮKassa отказывается создавать платёж.
 */

const API = "https://api.yookassa.ru/v3";

export function isConfigured(): boolean {
  return Boolean(
    process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY,
  );
}

/** Боевой ключ или тестовый — нужно показывать в логах и админке. */
export function isLive(): boolean {
  return !(process.env.YOOKASSA_SECRET_KEY ?? "").startsWith("test_");
}

function authHeader(): string {
  const pair = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`;
  return `Basic ${Buffer.from(pair, "utf8").toString("base64")}`;
}

function rub(value: number): string {
  return value.toFixed(2);
}

export type ReceiptItem = {
  description: string;
  quantity: number;
  priceRub: number;
};

export type CreatedPayment = {
  id: string;
  status: string;
  confirmationUrl: string;
};

export class YookassaError extends Error {}

async function call<T>(
  path: string,
  init: RequestInit & { idempotenceKey?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", authHeader());
  headers.set("Content-Type", "application/json");
  if (init.idempotenceKey) {
    headers.set("Idempotence-Key", init.idempotenceKey);
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
  } catch (e) {
    throw new YookassaError(`сеть недоступна: ${(e as Error).message}`);
  }

  const text = await res.text();
  if (!res.ok) {
    /* Тело ошибки ЮKassa может содержать описание магазина — в лог кладём
       только код и тип, чтобы не растащить лишнее по журналам. */
    let brief = `${res.status}`;
    try {
      const body = JSON.parse(text) as { code?: string; description?: string };
      brief = `${res.status} ${body.code ?? ""} ${body.description ?? ""}`.trim();
    } catch {
      /* нераспознанное тело — оставляем только статус */
    }
    throw new YookassaError(brief);
  }
  return JSON.parse(text) as T;
}

export async function createPayment(options: {
  amountRub: number;
  description: string;
  returnUrl: string;
  email: string;
  items: ReceiptItem[];
  metadata: Record<string, string | number>;
}): Promise<CreatedPayment> {
  const body = {
    amount: { value: rub(options.amountRub), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: options.returnUrl },
    description: options.description.slice(0, 128),
    metadata: options.metadata,
    receipt: {
      customer: { email: options.email },
      items: options.items.map((i) => ({
        description: i.description.slice(0, 128),
        quantity: String(i.quantity),
        amount: { value: rub(i.priceRub), currency: "RUB" },
        vat_code: 1,
        payment_mode: "full_payment",
        payment_subject: "commodity",
      })),
    },
  };

  const payment = await call<{
    id: string;
    status: string;
    confirmation?: { confirmation_url?: string };
  }>("/payments", {
    method: "POST",
    body: JSON.stringify(body),
    idempotenceKey: randomUUID(),
  });

  const url = payment.confirmation?.confirmation_url;
  if (!url) {
    throw new YookassaError("ЮKassa не вернула ссылку на оплату");
  }
  return { id: payment.id, status: payment.status, confirmationUrl: url };
}

export type FetchedPayment = {
  id: string;
  status: string;
  paid: boolean;
  amountRub: number;
  metadata: Record<string, string>;
};

/**
 * Уведомления ЮKassa не подписаны, поэтому телу POST-запроса верить нельзя:
 * состояние платежа всегда перечитываем у самой ЮKassa по его id.
 */
export async function getPayment(id: string): Promise<FetchedPayment> {
  const p = await call<{
    id: string;
    status: string;
    paid: boolean;
    amount: { value: string };
    metadata?: Record<string, string>;
  }>(`/payments/${encodeURIComponent(id)}`);
  return {
    id: p.id,
    status: p.status,
    paid: Boolean(p.paid),
    amountRub: Number(p.amount.value),
    metadata: p.metadata ?? {},
  };
}
