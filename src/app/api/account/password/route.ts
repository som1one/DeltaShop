import { NextResponse } from "next/server";
import {
  destroyAllSessions,
  getSessionUser,
  hashPassword,
  startSession,
  verifyPassword,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "@/lib/auth";
import { getPasswordHash, setPasswordHash } from "@/lib/users";

/** Смена пароля: старый на проверку, новый — с выходом на других устройствах. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { current?: unknown; next?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";
  if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const stored = await getPasswordHash(user.id);
  if (!stored || !(await verifyPassword(current, stored))) {
    return NextResponse.json({ error: "bad_credentials" }, { status: 401 });
  }

  await setPasswordHash(user.id, await hashPassword(next));
  /* Старые сессии гасим — если пароль меняют из-за подозрений, чужой вход
     обязан слететь. Текущему устройству выдаём новую. */
  await destroyAllSessions(user.id);
  await startSession(user.id);
  return NextResponse.json({ ok: true });
}
