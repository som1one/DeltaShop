import { NextResponse } from "next/server";
import {
  hashPassword,
  startSession,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "@/lib/auth";
import { createUser, EmailTakenError, normalizeEmail } from "@/lib/users";

/** Регистрация покупателя: заводим учётку и сразу впускаем в кабинет. */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const email = normalizeEmail(
    typeof body.email === "string" ? body.email : "",
  );
  const password = typeof body.password === "string" ? body.password : "";
  const name = (typeof body.name === "string" ? body.name : "").trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "bad_name" }, { status: 400 });
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  try {
    const user = await createUser({
      email,
      passwordHash: await hashPassword(password),
      name,
    });
    await startSession(user.id);
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof EmailTakenError) {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    console.error("регистрация не удалась", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
