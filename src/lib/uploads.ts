import "server-only";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

/**
 * Фото товаров, загруженные из админки. Лежат вне образа — в томе, который
 * переживает пересборку (`uploads:/app/uploads` в docker-compose).
 * Отдаются маршрутом /uploads/[...path], а не nginx: оптимизатор next/image
 * ходит за исходником по этому же адресу, и второй путь отдачи разошёлся бы
 * с первым по кэшу и правам.
 */

export const UPLOAD_ROOT =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

const PRODUCTS_DIR = path.join(UPLOAD_ROOT, "products");
const RECEIPTS_DIR = path.join(UPLOAD_ROOT, "receipts");

/** Длинная сторона: больше карточке не нужно, а вес растёт заметно. */
const MAX_SIDE = 1600;
const MAX_BYTES = 12 * 1024 * 1024;

export type SavedImage = { url: string; width: number; height: number };

export class UploadError extends Error {}

/**
 * Нормализует загруженный файл и кладёт в том. Возвращает публичный путь,
 * который пишется в products.image.
 */
export async function saveProductImage(
  file: File,
  slug: string,
): Promise<SavedImage> {
  if (file.size > MAX_BYTES) {
    throw new UploadError("Файл больше 12 МБ");
  }
  const input = Buffer.from(await file.arrayBuffer());

  let pipeline: sharp.Sharp;
  let meta: sharp.Metadata;
  try {
    pipeline = sharp(input, { failOn: "error" });
    meta = await pipeline.metadata();
  } catch {
    throw new UploadError("Не похоже на изображение");
  }
  if (!meta.width || !meta.height) {
    throw new UploadError("Не похоже на изображение");
  }

  const safeSlug =
    slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "product";
  const name = `${safeSlug}-${randomBytes(4).toString("hex")}.webp`;

  const out = await pipeline
    .rotate()
    .resize({
      width: MAX_SIDE,
      height: MAX_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 92 })
    .toBuffer({ resolveWithObject: true });

  await mkdir(PRODUCTS_DIR, { recursive: true });
  await writeFile(path.join(PRODUCTS_DIR, name), out.data);

  return {
    url: `/uploads/products/${name}`,
    width: out.info.width,
    height: out.info.height,
  };
}

/**
 * Чек по выплате партнёру — документ, а не картинка: пересжимать его нельзя,
 * поэтому кладём как есть, но только знакомых типов и под случайным именем.
 * Имя не угадать, и это единственная защита адреса файла: чек содержит имя
 * получателя и сумму.
 */
const RECEIPT_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export async function savePartnerReceipt(
  file: File,
  payoutId: number,
): Promise<{ url: string }> {
  if (file.size > MAX_BYTES) {
    throw new UploadError("Файл больше 12 МБ");
  }
  const ext = RECEIPT_TYPES[file.type];
  if (!ext) {
    throw new UploadError("Принимаем PDF, JPG или PNG");
  }
  const name = `payout-${payoutId}-${randomBytes(8).toString("hex")}${ext}`;
  await mkdir(RECEIPTS_DIR, { recursive: true });
  await writeFile(
    path.join(RECEIPTS_DIR, name),
    Buffer.from(await file.arrayBuffer()),
  );
  return { url: `/uploads/receipts/${name}` };
}

/**
 * Превращает запрошенный путь в файл внутри тома либо возвращает null.
 * Отдельная функция, потому что это единственное место, где пользовательский
 * ввод становится путём на диске — выход за корень должен быть невозможен.
 */
export function resolveUploadPath(segments: string[]): string | null {
  if (segments.some((s) => !s || s === "." || s === "..")) return null;
  const target = path.resolve(UPLOAD_ROOT, ...segments);
  const root = path.resolve(UPLOAD_ROOT);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}
