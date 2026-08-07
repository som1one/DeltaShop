import { NextResponse } from "next/server";
import { findTokenByCode, findTokenByNumberEmail } from "@/lib/orders";

/** Восстановление ссылки на заказ: по коду отслеживания или по номеру и почте. */
export async function POST(request: Request) {
  let body: { code?: string; invId?: number | string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (body.code) {
    const token = await findTokenByCode(String(body.code));
    if (!token) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ token });
  }

  const invId = Number(body.invId);
  const email = (body.email ?? "").trim();
  if (!Number.isInteger(invId) || invId <= 0 || !email) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const token = await findTokenByNumberEmail(invId, email);
  if (!token) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ token });
}
