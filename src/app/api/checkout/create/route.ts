import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { startPayment } from "@/lib/order-payment";
import { normalizeRefCode, REF_COOKIE } from "@/lib/partners";
import { fillEmptyProfile } from "@/lib/users";
import { isConfigured } from "@/lib/yookassa";
import type { CartLine } from "@/lib/cart";

type CreateBody = {
  lines: CartLine[];
  name?: string;
  phone?: string;
  region?: "cis" | "intl";
  city?: string;
  address?: string;
  culture?: "ru" | "en";
};

/**
 * Создаёт заказ в базе и платёж в ЮKassa. Возвращает { token, invId, url }
 * со ссылкой на оплату. Если ключи не настроены — 503: заказ остаётся
 * неоплаченным, и покупатель видит это словами.
 *
 * Заказ оформляется только из учётной записи: почта берётся из неё, а не
 * из формы, — иначе заказ можно было бы записать на чужой адрес.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  /* Проверяем до создания заказа: платить нечем — незачем и заводить в базе
     заказ, который никто никогда не оплатит. */
  if (!isConfigured()) {
    console.error("Чекаут: ключи ЮKassa не заданы, заказ не создаётся");
    return NextResponse.json(
      { error: "payment_unavailable" },
      { status: 503 },
    );
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: "empty cart" }, { status: 400 });
  }
  const name = (body.name ?? "").trim() || user.name;
  if (!name) {
    return NextResponse.json({ error: "bad contact" }, { status: 400 });
  }

  const phone = (body.phone ?? "").trim();
  const city = (body.city ?? "").trim();
  const address = (body.address ?? "").trim();

  /* Метка партнёра берётся только из куки, поставленной маршрутом /r/:
     коду из тела запроса верить нельзя — иначе чужую продажу можно
     переписать на себя одной строкой в консоли браузера. */
  const refCode = normalizeRefCode(
    (await cookies()).get(REF_COOKIE)?.value ?? "",
  );

  const order = await createOrder({
    lines: body.lines,
    userId: user.id,
    name,
    email: user.email,
    phone,
    region: body.region === "intl" ? "intl" : "cis",
    city,
    address,
    culture: body.culture === "en" ? "en" : "ru",
    refCode,
  });

  if (order.totalRub <= 0) {
    return NextResponse.json({ error: "empty cart" }, { status: 400 });
  }

  /* Пустой профиль дозаполняем данными доставки — следующий заказ
     оформится без повторного ввода. Заполненное не трогаем. */
  await fillEmptyProfile(user.id, { phone, city, address });

  const payment = await startPayment(order);
  const base = { token: order.token, invId: order.invId };
  if (payment.kind === "redirect") {
    return NextResponse.json({ ...base, url: payment.url });
  }
  /* Платить нечем: заказ остался в базе неоплаченным, и покупатель должен
     увидеть это словами, а не экран «заказ принят». */
  if (payment.kind === "unconfigured") {
    return NextResponse.json(
      { ...base, error: "payment_unavailable" },
      { status: 503 },
    );
  }
  /* Заказ уже в базе и виден в кабинете — покупателю показываем
     «принят», а не пустую ошибку; оплату можно повторить. */
  return NextResponse.json({ ...base, unpaid: true });
}
