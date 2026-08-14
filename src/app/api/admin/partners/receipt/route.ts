import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-auth";
import { attachReceipt } from "@/lib/partner-ledger";
import { savePartnerReceipt, UploadError } from "@/lib/uploads";

/**
 * Чек по выплате: самозанятый выдаёт его после перевода, ИП присылает свой
 * документ. Файл кладём в том загрузок и подшиваем к строке выплаты — без
 * него у ИП не остаётся подтверждения расхода.
 */
export async function POST(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Ожидается форма с файлом" },
      { status: 400 },
    );
  }

  const payoutId = Number(form.get("payoutId"));
  const file = form.get("file");
  if (!Number.isInteger(payoutId)) {
    return NextResponse.json({ error: "Некорректная выплата" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не приложен" }, { status: 400 });
  }

  try {
    const saved = await savePartnerReceipt(file, payoutId);
    const ok = await attachReceipt(payoutId, saved.url);
    if (!ok) {
      return NextResponse.json({ error: "Выплата не найдена" }, { status: 404 });
    }
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("чек не сохранился", e);
    return NextResponse.json(
      { error: "Не удалось сохранить чек" },
      { status: 500 },
    );
  }
}
