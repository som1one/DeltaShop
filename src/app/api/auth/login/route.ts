import { NextResponse } from "next/server";
import {
  clearAttempts,
  DUMMY_PASSWORD_HASH,
  isRateLimited,
  noteFailedAttempt,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { findForLogin, normalizeEmail } from "@/lib/users";

/** Вход по почте и паролю. */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const email = normalizeEmail(
    typeof body.email === "string" ? body.email : "",
  );
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "bad_credentials" }, { status: 401 });
  }
  if (isRateLimited(email)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const found = await findForLogin(email);
    /* Пароль проверяем всегда, даже когда учётки нет: одинаковое время
       ответа не выдаёт, зарегистрирован ли такой адрес. */
    const ok = await verifyPassword(
      password,
      found?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!found || !ok) {
      noteFailedAttempt(email);
      return NextResponse.json({ error: "bad_credentials" }, { status: 401 });
    }
    clearAttempts(email);
    await startSession(found.user.id);
    return NextResponse.json({ user: found.user });
  } catch (e) {
    console.error("вход не удался", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
