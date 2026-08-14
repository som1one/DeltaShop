import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listByUser } from "@/lib/orders";

/** Заказы текущего покупателя — лента кабинета. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const orders = await listByUser(user.id);
  return NextResponse.json({
    orders: orders.map((order) => ({
      invId: order.invId,
      token: order.token,
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
    })),
  });
}
