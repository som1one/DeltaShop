import { NextResponse } from "next/server";
import { createOrder, markPaid } from "@/lib/orders";
import { getProduct } from "@/lib/products-store";
import {
  createPayment,
  isConfigured,
  YookassaError,
} from "@/lib/yookassa";
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

const SITE_URL = process.env.SITE_URL ?? "https://forma-visual.com";

/**
 * Создаёт заказ в базе и платёж в ЮKassa.
 * Возвращает { token, invId, url } либо { token, invId, demo: true },
 * если ключи не настроены — заказ остаётся в статусе «принят».
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
    return NextResponse.json({
      token: order.token,
      invId: order.invId,
      demo: true,
    });
  }

  /* Позиции чека собираем из заказа, а не из корзины: суммы там уже
     пересчитаны по каталогу на сервере. Сумма строк обязана сойтись
     с суммой платежа, иначе ЮKassa откажет. */
  const items = [];
  for (const item of order.items) {
    const product = await getProduct(item.productId);
    const title = product ? product.name[order.culture] : item.productId;
    items.push({
      description: item.size ? `${title} (${item.size})` : title,
      quantity: item.qty,
      /* Цена ЗА ЕДИНИЦУ: ЮKassa сама умножает на количество, и сумма
         строк обязана сойтись с суммой платежа. */
      priceRub: item.priceRub,
    });
  }

  try {
    const payment = await createPayment({
      amountRub: order.totalRub,
      description: `FORMA VISUAL — заказ №${order.invId}`,
      returnUrl: `${SITE_URL}/checkout/success`,
      email: order.email,
      items,
      /* По metadata уведомление находит заказ — отдельная колонка в базе
         под идентификатор платежа не нужна. */
      metadata: { invId: String(order.invId), token: order.token },
    });

    return NextResponse.json({
      token: order.token,
      invId: order.invId,
      url: payment.confirmationUrl,
    });
  } catch (e) {
    if (e instanceof YookassaError) {
      console.error(`ЮKassa не создала платёж для №${order.invId}: ${e.message}`);
      /* Заказ уже в базе и виден в кабинете — покупателю показываем
         «принят», а не пустую ошибку; оплату можно повторить. */
      return NextResponse.json({
        token: order.token,
        invId: order.invId,
        unpaid: true,
      });
    }
    throw e;
  }
}
