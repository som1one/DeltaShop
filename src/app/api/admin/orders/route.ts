import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-auth";
import { adminList, adminUpdate, type OrderStatus } from "@/lib/orders";

export async function GET(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? "all";
  return NextResponse.json({
    orders: await adminList({
      search: params.get("search") ?? undefined,
      status: STATUSES.includes(status as OrderStatus)
        ? (status as OrderStatus)
        : "all",
    }),
  });
}

const STATUSES: OrderStatus[] = [
  "new",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

export async function PATCH(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  let body: { invId?: number; status?: string; track?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const invId = Number(body.invId);
  if (!Number.isInteger(invId)) {
    return NextResponse.json({ error: "bad invId" }, { status: 400 });
  }
  const patch: { status?: OrderStatus; track?: string | null } = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as OrderStatus)) {
      return NextResponse.json({ error: "bad status" }, { status: 400 });
    }
    patch.status = body.status as OrderStatus;
  }
  if (body.track !== undefined) {
    patch.track = body.track === null ? null : String(body.track).slice(0, 64);
  }
  const order = await adminUpdate(invId, patch);
  if (!order) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}
