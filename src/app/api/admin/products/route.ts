import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-auth";
import {
  createProduct,
  deleteProduct,
  listProducts,
  moveProduct,
  updateProduct,
  type ProductInput,
} from "@/lib/products-store";

/**
 * Каталог правится из админки, поэтому вход проверяется целиком, а не
 * «на глазок»: цены уходят в оплату, а image — в src картинки.
 */

class Invalid extends Error {}

function text(value: unknown, field: string, max: number, required = true): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s && required) throw new Invalid(`Не заполнено: ${field}`);
  if (s.length > max) throw new Invalid(`Слишком длинное поле: ${field}`);
  return s;
}

function money(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 10_000_000) {
    throw new Invalid(`Некорректная цена: ${field}`);
  }
  return n;
}

/** Путь к картинке — только наши каталоги: и /public, и том загрузок. */
function imagePath(value: unknown): string {
  const s = text(value, "фото", 300);
  if (!/^\/(products|uploads)\/[A-Za-z0-9._\-/]+$/.test(s) || s.includes("..")) {
    throw new Invalid("Некорректный путь к фото");
  }
  return s;
}

function videoPath(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = text(value, "видео", 300);
  if (!/^\/[A-Za-z0-9._\-/]+$/.test(s) || s.includes("..")) {
    throw new Invalid("Некорректный путь к видео");
  }
  return s;
}

function sizes(value: unknown): string[] | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = Array.isArray(value)
    ? value.map(String)
    : String(value).split(",");
  const list = raw.map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return null;
  if (list.length > 20) throw new Invalid("Слишком много размеров");
  if (list.some((s) => s.length > 16)) throw new Invalid("Слишком длинный размер");
  return list;
}

function slug(value: unknown): string {
  const s = text(value, "идентификатор", 50);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s)) {
    throw new Invalid("Идентификатор: только латиница в нижнем регистре, цифры и дефис");
  }
  return s;
}

function parseBody(body: Record<string, unknown>): Omit<ProductInput, "id"> {
  const house = body.house === "forma" ? "forma" : "visual";
  const imageStyle = body.imageStyle === "cover" ? "cover" : "cutout";
  return {
    house,
    name: {
      ru: text(body.nameRu, "название (RU)", 120),
      en: text(body.nameEn, "название (EN)", 120),
    },
    tagline: {
      ru: text(body.taglineRu, "подпись (RU)", 200),
      en: text(body.taglineEn, "подпись (EN)", 200),
    },
    description: {
      ru: text(body.descriptionRu, "описание (RU)", 4000),
      en: text(body.descriptionEn, "описание (EN)", 4000),
    },
    composition: {
      ru: text(body.compositionRu, "состав (RU)", 2000),
      en: text(body.compositionEn, "состав (EN)", 2000),
    },
    priceRub: money(body.priceRub, "₽"),
    priceUsd: money(body.priceUsd, "$"),
    image: imagePath(body.image),
    sizes: sizes(body.sizes),
    video: videoPath(body.video),
    featured: Boolean(body.featured),
    imageStyle,
  };
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new Invalid("Некорректный JSON");
  }
}

function fail(e: unknown) {
  if (e instanceof Invalid) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  console.error("admin/products", e);
  return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
}

export async function GET(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  return NextResponse.json({ products: await listProducts() });
}

export async function POST(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  try {
    const body = await readJson(request);
    const id = slug(body.id);
    const existing = await listProducts();
    if (existing.some((p) => p.id === id)) {
      throw new Invalid("Товар с таким идентификатором уже есть");
    }
    const product = await createProduct({ id, ...parseBody(body) });
    return NextResponse.json({ product });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  try {
    const body = await readJson(request);
    const id = slug(body.id);
    const product = await updateProduct(id, parseBody(body));
    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch (e) {
    return fail(e);
  }
}

/** Перестановка в порядке каталога. */
export async function PATCH(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  try {
    const body = await readJson(request);
    const id = slug(body.id);
    const move = body.move === "up" ? "up" : body.move === "down" ? "down" : null;
    if (!move) throw new Invalid("Неизвестное действие");
    await moveProduct(id, move);
    return NextResponse.json({ products: await listProducts() });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  try {
    const id = slug(new URL(request.url).searchParams.get("id"));
    const ok = await deleteProduct(id);
    if (!ok) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
