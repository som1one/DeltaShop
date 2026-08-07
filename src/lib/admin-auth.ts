import "server-only";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/** Простейшая защита мини-админки: ключ из env в заголовке X-Admin-Key. */
export function checkAdminKey(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  }
  const got = request.headers.get("x-admin-key") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
