import "server-only";
import type { Order } from "./orders";
import { getProduct } from "./products-store";
import { createPayment, isConfigured, YookassaError } from "./yookassa";

/**
 * Платёж по уже существующему заказу. Используется и на чекауте, и в
 * кабинете, когда покупатель возвращается к неоплаченному заказу, — иначе
 * логика сборки чека разъехалась бы по двум маршрутам.
 */

export type PaymentStart =
  | { kind: "redirect"; url: string }
  /** Ключи ЮKassa не заданы — платить нечем, заказ остаётся неоплаченным */
  | { kind: "unconfigured" }
  /** ЮKassa не ответила — заказ остаётся неоплаченным, попробуем позже */
  | { kind: "unpaid" };

const SITE_URL = process.env.SITE_URL ?? "https://forma-visual.com";

export async function startPayment(order: Order): Promise<PaymentStart> {
  /* Раньше здесь был демо-режим: без ключей заказ молча помечался
     оплаченным. Это давало «оплаченные» заказы без единого рубля — и
     любому, кто нажмёт кнопку. Нет ключей — нет оплаты. */
  if (!isConfigured()) {
    console.error(
      `Оплата не настроена: заказ №${order.invId} остаётся неоплаченным`,
    );
    return { kind: "unconfigured" };
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
    return { kind: "redirect", url: payment.confirmationUrl };
  } catch (e) {
    if (e instanceof YookassaError) {
      console.error(`ЮKassa не создала платёж для №${order.invId}: ${e.message}`);
      return { kind: "unpaid" };
    }
    throw e;
  }
}
