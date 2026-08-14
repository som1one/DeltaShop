import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookie, destroySession, SESSION_COOKIE } from "@/lib/auth";

/** Выход: убираем сессию из базы и куку из браузера. */
export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await destroySession(token);
    } catch (e) {
      console.error("не удалось удалить сессию", e);
    }
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
