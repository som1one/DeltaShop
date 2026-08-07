import { NextResponse } from "next/server";
import { isConfigured, verifyResultSignature } from "@/lib/robokassa";
import { markPaid } from "@/lib/orders";

/**
 * ResultURL для Robokassa: сюда приходит серверное уведомление об оплате.
 * Проверяем подпись (Пароль #2) и отвечаем OK{InvId} — иначе Robokassa
 * будет повторять уведомление. URL указывается в кабинете мерчанта:
 *   https://<домен>/api/robokassa/result   (метод POST или GET)
 * Когда появится база заказов, здесь же будем помечать заказ оплаченным.
 */
async function handle(params: URLSearchParams) {
  if (!isConfigured()) {
    return new NextResponse("not configured", { status: 503 });
  }
  const OutSum = params.get("OutSum") ?? "";
  const InvId = params.get("InvId") ?? "";
  const SignatureValue = params.get("SignatureValue") ?? "";

  if (!OutSum || !InvId || !SignatureValue) {
    return new NextResponse("bad request", { status: 400 });
  }
  if (!verifyResultSignature({ OutSum, InvId, SignatureValue })) {
    return new NextResponse("bad sign", { status: 400 });
  }
  await markPaid(Number(InvId));
  return new NextResponse(`OK${InvId}`);
}

export async function GET(request: Request) {
  return handle(new URL(request.url).searchParams);
}

export async function POST(request: Request) {
  const text = await request.text();
  return handle(new URLSearchParams(text));
}
