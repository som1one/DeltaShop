import { NextResponse } from "next/server";
import { createApplication, hasPendingApplication } from "@/lib/partners";

/** Публичный приём заявки с /partners. */
export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "bad name" }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: "bad email" }, { status: 400 });
  }

  try {
    /* Повторную заявку принимаем молча: для отправителя всё выглядит
       одинаково, а в кабинете не растёт куча дублей. */
    if (!(await hasPendingApplication(email))) {
      await createApplication({ name, email });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("partner application failed", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
