import { NextResponse } from "next/server";
import { buildPaymentUrl, isConfigured } from "@/lib/robokassa";
import { createOrder, markPaid } from "@/lib/orders";
import type { CartLine } from "@/lib/cart";

type CreateBody = {
  lines: CartLine[];
  name?: string;
  email?: string;
  phone?: string;
  region?: "cis" | "intl";
  city?: string;
  address?: string;
  culture?: "ru" | "en";
};

/**
 * Создаёт заказ в базе и платёжную ссылку Robokassa.
 * Возвращает { token, invId, url } либо { token, invId, demo: true },
 * если ключи Robokassa не настроены — заказ остаётся в статусе «принят».
 */
export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: "empty cart" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "bad contact" }, { status: 400 });
  }

  const order = await createOrder({
    lines: body.lines,
    name,
    email,
    phone: (body.phone ?? "").trim(),
    region: body.region === "intl" ? "intl" : "cis",
    city: (body.city ?? "").trim(),
    address: (body.address ?? "").trim(),
    culture: body.culture === "en" ? "en" : "ru",
  });

  if (order.totalRub <= 0) {
    return NextResponse.json({ error: "empty cart" }, { status: 400 });
  }

  if (!isConfigured()) {
    /* Демо-режим: шага оплаты нет, покупатель сразу видит «заказ принят» —
       статус в базе обязан совпадать с тем, что видит человек */
    await markPaid(order.invId);
    return NextResponse.json({ token: order.token, invId: order.invId, demo: true });
  }

  const url = buildPaymentUrl({
    outSumRub: order.totalRub,
    invId: order.invId,
    description: `FORMA VISUAL — заказ №${order.invId}`,
    email: order.email,
    culture: order.culture,
  });

  return NextResponse.json({ token: order.token, invId: order.invId, url });
}
