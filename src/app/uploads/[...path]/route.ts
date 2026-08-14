import { readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveUploadPath } from "@/lib/uploads";

/** Отдаёт файлы из тома загрузок. Расширения — только те, что мы сами пишем. */
const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  /* Чеки по выплатам партнёрам */
  ".pdf": "application/pdf",
};

/** Чек — документ с именем получателя и суммой: общим кэшам он не игрушка. */
const PRIVATE = new Set([".pdf"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const file = resolveUploadPath(segments);
  if (!file) {
    return new NextResponse("not found", { status: 404 });
  }
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  const type = TYPES[ext];
  if (!type) {
    return new NextResponse("not found", { status: 404 });
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) return new NextResponse("not found", { status: 404 });
    const body = await readFile(file);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        /* Имя файла содержит случайный суффикс и никогда не переиспользуется,
           поэтому содержимое по адресу неизменно. */
        "Cache-Control": PRIVATE.has(ext)
          ? "private, max-age=31536000, immutable"
          : "public, max-age=31536000, immutable",
        "Content-Length": String(info.size),
      },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
