import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getByInvId } from "@/lib/orders";
import { startPayment } from "@/lib/order-payment";

/** Повторная оплата заказа из кабинета: создаёт новый платёж ЮKassa. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ invId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const invId = Number((await params).invId);
  if (!Number.isInteger(invId) || invId <= 0) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const order = await getByInvId(invId);
  /* Чужой заказ и несуществующий отвечают одинаково — по ответу нельзя
     перебрать номера. */
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (order.status !== "new") {
    return NextResponse.json({ error: "not payable" }, { status: 409 });
  }

  const payment = await startPayment(order);
  if (payment.kind === "redirect") {
    return NextResponse.json({ url: payment.url });
  }
  if (payment.kind === "unconfigured") {
    return NextResponse.json(
      { error: "payment_unavailable" },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "provider" }, { status: 502 });
}
