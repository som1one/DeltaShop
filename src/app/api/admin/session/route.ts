import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-auth";

/** Проверка ключа без побочных эффектов — используется формой входа. */
export async function GET(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  return NextResponse.json({ ok: true });
}
