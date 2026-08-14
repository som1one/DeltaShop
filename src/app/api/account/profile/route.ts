import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateProfile } from "@/lib/users";

/** Профиль покупателя: имя и данные доставки. Почта не меняется. */
export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    name?: unknown;
    phone?: unknown;
    city?: unknown;
    address?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const name = str(body.name)?.trim();
  if (name !== undefined && (!name || name.length > 120)) {
    return NextResponse.json({ error: "bad_name" }, { status: 400 });
  }

  const updated = await updateProfile(user.id, {
    name,
    phone: str(body.phone),
    city: str(body.city),
    address: str(body.address),
  });
  if (!updated) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user: updated });
}
