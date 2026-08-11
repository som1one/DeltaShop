import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-auth";
import { adminList, adminUpdate, type PartnerStatus } from "@/lib/partners";

const STATUSES: PartnerStatus[] = ["new", "approved", "rejected"];

export async function GET(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  return NextResponse.json({ applications: await adminList() });
}

export async function PATCH(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  let body: { id?: unknown; status?: unknown; note?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const patch: { status?: PartnerStatus; note?: string | null } = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as PartnerStatus)) {
      return NextResponse.json({ error: "Неизвестный статус" }, { status: 400 });
    }
    patch.status = body.status as PartnerStatus;
  }
  if (body.note !== undefined) {
    patch.note =
      body.note === null ? null : String(body.note).trim().slice(0, 500) || null;
  }

  const application = await adminUpdate(id, patch);
  if (!application) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  return NextResponse.json({ application });
}
