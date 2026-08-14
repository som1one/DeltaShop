import "server-only";

/**
 * ВНИМАНИЕ: маршруты /api/robokassa/* удалены (2026-08-14).
 *
 * Без ключей Robokassa маршрут создания заказа работал в демо-режиме и
 * помечал заказ оплаченным без единого рубля — то есть кто угодно мог
 * получить «оплаченный» заказ, а с партнёрской программой ещё и начисление.
 * Приёмный маршрут вдобавок проверял подпись, но не сверял сумму с заказом.
 *
 * Модуль оставлен целиком: если Robokassa когда-нибудь вернётся, маршруты
 * пишутся заново — с проверкой суммы и без демо-режима.
 */
import { createHash } from "crypto";

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
