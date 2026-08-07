import "server-only";
import { createHash } from "crypto";
import { getProduct } from "./products";
import type { CartLine } from "./cart";

/**
 * Robokassa integration (https://docs.robokassa.ru).
 *
 * Configuration via env (.env.local):
 *   ROBOKASSA_LOGIN      — MerchantLogin из кабинета
 *   ROBOKASSA_PASSWORD1  — Пароль #1 (подпись платёжной ссылки)
 *   ROBOKASSA_PASSWORD2  — Пароль #2 (проверка уведомления ResultURL)
 *   ROBOKASSA_TEST       — "1" для тестового режима (IsTest=1)
 *
 * Пока переменные не заданы, isConfigured() == false и чекаут работает
 * в демо-режиме без реального списания.
 */

const PAYMENT_URL = "https://auth.robokassa.ru/Merchant/Index.aspx";

export function isConfigured(): boolean {
  return Boolean(
    process.env.ROBOKASSA_LOGIN &&
      process.env.ROBOKASSA_PASSWORD1 &&
      process.env.ROBOKASSA_PASSWORD2,
  );
}

function md5(value: string): string {
  return createHash("md5").update(value, "utf8").digest("hex");
}

/** Сумма заказа считается ТОЛЬКО на сервере из каталога — суммам с клиента не верим. */
export function computeTotalRub(lines: CartLine[]): number {
  let total = 0;
  for (const line of lines) {
    const product = getProduct(line.productId);
    if (!product) continue;
    const qty = Math.min(Math.max(Math.trunc(line.qty), 1), 9);
    total += product.priceRub * qty;
  }
  return total;
}

/** InvId: положительный int32, монотонный (секунды с 2026-01-01 + счётчик в пределах секунды). */
const EPOCH_2026 = Date.UTC(2026, 0, 1) / 1000;
let lastInvId = 0;
export function nextInvId(): number {
  const candidate = Math.floor(Date.now() / 1000 - EPOCH_2026);
  lastInvId = candidate > lastInvId ? candidate : lastInvId + 1;
  return lastInvId;
}

export function buildPaymentUrl(options: {
  outSumRub: number;
  invId: number;
  description: string;
  email?: string;
  culture: "ru" | "en";
}): string {
  const login = process.env.ROBOKASSA_LOGIN!;
  const password1 = process.env.ROBOKASSA_PASSWORD1!;
  const outSum = options.outSumRub.toFixed(2);

  const signature = md5(
    `${login}:${outSum}:${options.invId}:${password1}`,
  ).toUpperCase();

  const params = new URLSearchParams({
    MerchantLogin: login,
    OutSum: outSum,
    InvId: String(options.invId),
    Description: options.description.slice(0, 100),
    SignatureValue: signature,
    Culture: options.culture,
    Encoding: "utf-8",
  });
  if (options.email) params.set("Email", options.email);
  if (process.env.ROBOKASSA_TEST === "1") params.set("IsTest", "1");

  return `${PAYMENT_URL}?${params.toString()}`;
}

/** Проверка подписи уведомления ResultURL (Пароль #2). */
export function verifyResultSignature(query: {
  OutSum: string;
  InvId: string;
  SignatureValue: string;
}): boolean {
  const password2 = process.env.ROBOKASSA_PASSWORD2!;
  const expected = md5(`${query.OutSum}:${query.InvId}:${password2}`);
  return expected.toLowerCase() === query.SignatureValue.toLowerCase();
}

/** Проверка подписи редиректа на SuccessURL (Пароль #1). */
export function verifySuccessSignature(query: {
  OutSum: string;
  InvId: string;
  SignatureValue: string;
}): boolean {
  const password1 = process.env.ROBOKASSA_PASSWORD1!;
  const expected = md5(`${query.OutSum}:${query.InvId}:${password1}`);
  return expected.toLowerCase() === query.SignatureValue.toLowerCase();
}
