"use client";

/**
 * Тонкая обёртка над fetch для кабинета: подставляет ключ и разворачивает
 * ошибку сервера в текст, который не стыдно показать.
 */

export class AdminError extends Error {}

export async function adminFetch<T>(
  key: string,
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-admin-key", key);
  /* Только для строкового тела: у FormData заголовок с границей раздела
     проставляет сам fetch, и подмена его на application/json ломает разбор. */
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(input, { ...init, headers });
  } catch {
    throw new AdminError("Сервер недоступен");
  }

  if (!res.ok) {
    let message: string;
    if (res.status === 403) message = "Неверный ключ";
    else if (res.status === 503) message = "ADMIN_PASSWORD не задан на сервере";
    else {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      message = data?.error ?? `Ошибка ${res.status}`;
    }
    throw new AdminError(message);
  }

  return (await res.json()) as T;
}
