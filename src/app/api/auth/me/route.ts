import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

/** Текущий покупатель — для восстановления состояния на клиенте. */
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
