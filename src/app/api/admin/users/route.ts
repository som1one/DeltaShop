import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-auth";
import {
  destroyAllSessions,
  hashPassword,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "@/lib/auth";
import { adminList, findById, setPasswordHash } from "@/lib/users";

export async function GET(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  return NextResponse.json({ users: await adminList({ search }) });
}

/**
 * Сброс пароля покупателю. Писем сайт не шлёт, поэтому забытый пароль
 * задаётся здесь и диктуется покупателю в ответном письме.
 */
export async function POST(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  let body: { id?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return NextResponse.json(
      { error: `Пароль — от ${PASSWORD_MIN} знаков` },
      { status: 400 },
    );
  }

  const user = await findById(id);
  if (!user) {
    return NextResponse.json({ error: "Покупатель не найден" }, { status: 404 });
  }

  await setPasswordHash(id, await hashPassword(password));
  /* Прежние входы гасим: если пароль сбрасывают после угона учётки,
     чужая сессия обязана слететь. */
  await destroyAllSessions(id);
  return NextResponse.json({ ok: true });
}
