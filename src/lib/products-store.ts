import "server-only";
import { getPool, initDb } from "./db";
import { SEED_PRODUCTS } from "./products-seed";
import type { House, Product } from "./products";

/**
 * Каталог в Postgres. Читается на каждый рендер, поэтому держим короткий
 * кэш в процессе: база маленькая, а страницы дёргают список постоянно.
 * Любая запись из админки сбрасывает кэш немедленно.
 */

type Row = {
  id: string;
  house: string;
  name_ru: string;
  name_en: string;
  tagline_ru: string;
  tagline_en: string;
  description_ru: string;
  description_en: string;
  composition_ru: string;
  composition_en: string;
  price_rub: number;
  price_usd: number;
  image: string;
  sizes_json: string | null;
  video: string | null;
  featured: boolean;
  image_style: string;
  sort_order: number;
};

function toProduct(row: Row): Product {
  let sizes: string[] | null = null;
  if (row.sizes_json) {
    try {
      const parsed = JSON.parse(row.sizes_json) as unknown;
      if (Array.isArray(parsed)) sizes = parsed.map(String);
    } catch {
      /* повреждённое поле — считаем, что размеров нет */
    }
  }
  return {
    id: row.id,
    house: row.house === "forma" ? "forma" : "visual",
    name: { ru: row.name_ru, en: row.name_en },
    tagline: { ru: row.tagline_ru, en: row.tagline_en },
    description: { ru: row.description_ru, en: row.description_en },
    composition: { ru: row.composition_ru, en: row.composition_en },
    priceRub: row.price_rub,
    priceUsd: row.price_usd,
    image: row.image,
    sizes: sizes && sizes.length > 0 ? sizes : null,
    video: row.video,
    featured: row.featured,
    imageStyle: row.image_style === "cover" ? "cover" : "cutout",
  };
}

const COLUMNS = `id, house, name_ru, name_en, tagline_ru, tagline_en,
  description_ru, description_en, composition_ru, composition_en,
  price_rub, price_usd, image, sizes_json, video, featured,
  image_style, sort_order`;

let ready = false;
async function ensureReady(): Promise<void> {
  if (ready) return;
  await initDb();
  await seedIfEmpty();
  ready = true;
}

/** Разливает стартовый каталог, если таблица пуста. Идемпотентно. */
async function seedIfEmpty(): Promise<void> {
  const pool = getPool();
  const res = await pool.query("SELECT COUNT(*)::int AS n FROM products");
  if ((res.rows[0] as { n: number }).n > 0) return;
  const now = new Date().toISOString();
  for (const [i, p] of SEED_PRODUCTS.entries()) {
    await pool.query(
      `INSERT INTO products
         (id, house, name_ru, name_en, tagline_ru, tagline_en,
          description_ru, description_en, composition_ru, composition_en,
          price_rub, price_usd, image, sizes_json, video, featured,
          image_style, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (id) DO NOTHING`,
      [
        p.id,
        p.house,
        p.name.ru,
        p.name.en,
        p.tagline.ru,
        p.tagline.en,
        p.description.ru,
        p.description.en,
        p.composition.ru,
        p.composition.en,
        p.priceRub,
        p.priceUsd,
        p.image,
        p.sizes ? JSON.stringify(p.sizes) : null,
        p.video,
        p.featured,
        p.imageStyle,
        (i + 1) * 10,
        now,
        now,
      ],
    );
  }
}

let cache: { at: number; items: Product[] } | null = null;
const TTL_MS = 30_000;

export function invalidateProducts(): void {
  cache = null;
}

export async function listProducts(): Promise<Product[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    `SELECT ${COLUMNS} FROM products ORDER BY sort_order, id`,
  );
  const items = (res.rows as Row[]).map(toProduct);
  cache = { at: Date.now(), items };
  return items;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const items = await listProducts();
  return items.find((p) => p.id === id);
}

export async function listByHouse(house: House): Promise<Product[]> {
  return (await listProducts()).filter((p) => p.house === house);
}

/** Порядковый номер в конце списка — для только что созданного товара. */
async function nextSortOrder(): Promise<number> {
  const pool = getPool();
  const res = await pool.query(
    "SELECT COALESCE(MAX(sort_order), 0)::int AS m FROM products",
  );
  return (res.rows[0] as { m: number }).m + 10;
}

export type ProductInput = Omit<Product, "id"> & { id: string };

export async function createProduct(input: ProductInput): Promise<Product> {
  await ensureReady();
  const pool = getPool();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO products
       (id, house, name_ru, name_en, tagline_ru, tagline_en,
        description_ru, description_en, composition_ru, composition_en,
        price_rub, price_usd, image, sizes_json, video, featured,
        image_style, sort_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      input.id,
      input.house,
      input.name.ru,
      input.name.en,
      input.tagline.ru,
      input.tagline.en,
      input.description.ru,
      input.description.en,
      input.composition.ru,
      input.composition.en,
      input.priceRub,
      input.priceUsd,
      input.image,
      input.sizes ? JSON.stringify(input.sizes) : null,
      input.video,
      input.featured,
      input.imageStyle,
      await nextSortOrder(),
      now,
      now,
    ],
  );
  invalidateProducts();
  return (await getProduct(input.id))!;
}

export async function updateProduct(
  id: string,
  input: Omit<ProductInput, "id">,
): Promise<Product | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    `UPDATE products SET
       house = $2, name_ru = $3, name_en = $4, tagline_ru = $5, tagline_en = $6,
       description_ru = $7, description_en = $8, composition_ru = $9,
       composition_en = $10, price_rub = $11, price_usd = $12, image = $13,
       sizes_json = $14, video = $15, featured = $16, image_style = $17,
       updated_at = $18
     WHERE id = $1`,
    [
      id,
      input.house,
      input.name.ru,
      input.name.en,
      input.tagline.ru,
      input.tagline.en,
      input.description.ru,
      input.description.en,
      input.composition.ru,
      input.composition.en,
      input.priceRub,
      input.priceUsd,
      input.image,
      input.sizes ? JSON.stringify(input.sizes) : null,
      input.video,
      input.featured,
      input.imageStyle,
      new Date().toISOString(),
    ],
  );
  invalidateProducts();
  if ((res.rowCount ?? 0) === 0) return null;
  return (await getProduct(id)) ?? null;
}

export async function deleteProduct(id: string): Promise<boolean> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query("DELETE FROM products WHERE id = $1", [id]);
  invalidateProducts();
  return (res.rowCount ?? 0) > 0;
}

/** Переставляет товар на одну позицию вверх/вниз в общем порядке. */
export async function moveProduct(
  id: string,
  direction: "up" | "down",
): Promise<boolean> {
  await ensureReady();
  const pool = getPool();
  const cur = await pool.query(
    "SELECT sort_order::int AS s FROM products WHERE id = $1",
    [id],
  );
  const row = cur.rows[0] as { s: number } | undefined;
  if (!row) return false;
  const cmp = direction === "up" ? "<" : ">";
  const dir = direction === "up" ? "DESC" : "ASC";
  const neighbour = await pool.query(
    `SELECT id, sort_order::int AS s FROM products
     WHERE sort_order ${cmp} $1 ORDER BY sort_order ${dir} LIMIT 1`,
    [row.s],
  );
  const other = neighbour.rows[0] as { id: string; s: number } | undefined;
  if (!other) return false;
  const now = new Date().toISOString();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE products SET sort_order = $1, updated_at = $2 WHERE id = $3",
      [other.s, now, id],
    );
    await client.query(
      "UPDATE products SET sort_order = $1, updated_at = $2 WHERE id = $3",
      [row.s, now, other.id],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  invalidateProducts();
  return true;
}
