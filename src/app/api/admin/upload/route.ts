import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-auth";
import { UploadError, saveProductImage } from "@/lib/uploads";

export async function POST(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ожидается форма с файлом" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не приложен" }, { status: 400 });
  }
  const slug = String(form.get("slug") ?? "product");

  try {
    const saved = await saveProductImage(file, slug);
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("upload failed", e);
    return NextResponse.json({ error: "Не удалось сохранить файл" }, { status: 500 });
  }
}
