import { NextResponse } from "next/server";
import { getByToken } from "@/lib/orders";

/** Публичные данные заказа по секретному токену из ссылки. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const order = await getByToken(token);
  if (!order) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    invId: order.invId,
    status: order.status,
    items: order.items,
    totalRub: order.totalRub,
    region: order.region,
    city: order.city,
    track: order.track,
    stageNotes: order.stageNotes,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    updatedAt: order.updatedAt,
  });
}
