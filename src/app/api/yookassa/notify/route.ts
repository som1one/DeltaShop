import { NextResponse } from "next/server";
import { getByInvId, markPaid } from "@/lib/orders";
import { getPayment, isConfigured, YookassaError } from "@/lib/yookassa";

/**
 * Уведомление ЮKassa об оплате.
 * В кабинете ЮKassa указать: https://<домен>/api/yookassa/notify
 *
 * ЮKassa не подписывает уведомления, поэтому телу запроса не верим совсем:
 * из него берём ТОЛЬКО идентификатор платежа, а состояние и сумму
 * перечитываем у самой ЮKassa. Подделанный POST так ничего не оплатит.
 *
 * Отвечаем 200 на всё, что разобрали: ненулевой код заставит ЮKassa
 * повторять доставку, а повторять тут нечего.
 */
export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ ok: true, skipped: "not configured" });
  }

  let body: { event?: string; object?: { id?: string } };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const paymentId = body.object?.id;
  if (!paymentId || typeof paymentId !== "string") {
    return NextResponse.json({ error: "no payment id" }, { status: 400 });
  }

  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (e) {
    if (e instanceof YookassaError) {
      console.error(`ЮKassa: не удалось перечитать платёж ${paymentId}: ${e.message}`);
      /* Сеть или ЮKassa моргнули — просим доставить уведомление ещё раз */
      return NextResponse.json({ error: "retry" }, { status: 500 });
    }
    throw e;
  }

  if (payment.status !== "succeeded" || !payment.paid) {
    return NextResponse.json({ ok: true, status: payment.status });
  }

  const invId = Number(payment.metadata.invId);
  if (!Number.isInteger(invId)) {
    console.error(`ЮKassa: у платежа ${paymentId} нет invId в metadata`);
    return NextResponse.json({ ok: true, ignored: "no invId" });
  }

  const order = await getByInvId(invId);
  if (!order) {
    console.error(`ЮKassa: заказ №${invId} из платежа ${paymentId} не найден`);
    return NextResponse.json({ ok: true, ignored: "order not found" });
  }

  /* Оплачено меньше, чем стоит заказ, — платить статусом «оплачен» нельзя */
  if (Math.round(payment.amountRub * 100) < Math.round(order.totalRub * 100)) {
    console.error(
      `ЮKassa: платёж ${paymentId} на ${payment.amountRub} ₽ меньше заказа №${invId} (${order.totalRub} ₽)`,
    );
    return NextResponse.json({ ok: true, ignored: "amount mismatch" });
  }

  await markPaid(invId, "yookassa");
  return NextResponse.json({ ok: true });
}
