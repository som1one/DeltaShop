import "server-only";
import { Pool } from "pg";

/**
 * PostgreSQL-хранилище заказов.
 * Подключение через DATABASE_URL из переменных окружения.
 * Единый пул на процесс; в dev Next.js перезагружает модули —
 * держим пул в globalThis.
 */

declare global {
  var __fvPool: Pool | undefined;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
  return pool;
}

export function getPool(): Pool {
  if (!globalThis.__fvPool) {
    globalThis.__fvPool = createPool();
  }
  return globalThis.__fvPool;
}

/** Создаёт таблицы, если их ещё нет. Вызывается лениво перед первым запросом. */
export async function initDb(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      inv_id     INTEGER PRIMARY KEY,
      token      TEXT NOT NULL UNIQUE,
      status     TEXT NOT NULL DEFAULT 'new',
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      phone      TEXT NOT NULL,
      region     TEXT NOT NULL,
      city       TEXT NOT NULL,
      address    TEXT NOT NULL,
      culture    TEXT NOT NULL DEFAULT 'ru',
      total_rub  INTEGER NOT NULL,
      items_json TEXT NOT NULL,
      track      TEXT,
      created_at TEXT NOT NULL,
      paid_at    TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);

    CREATE TABLE IF NOT EXISTS products (
      id             TEXT PRIMARY KEY,
      house          TEXT NOT NULL,
      name_ru        TEXT NOT NULL,
      name_en        TEXT NOT NULL,
      tagline_ru     TEXT NOT NULL,
      tagline_en     TEXT NOT NULL,
      description_ru TEXT NOT NULL,
      description_en TEXT NOT NULL,
      composition_ru TEXT NOT NULL,
      composition_en TEXT NOT NULL,
      price_rub      INTEGER NOT NULL,
      price_usd      INTEGER NOT NULL,
      image          TEXT NOT NULL,
      sizes_json     TEXT,
      video          TEXT,
      featured       BOOLEAN NOT NULL DEFAULT FALSE,
      image_style    TEXT NOT NULL DEFAULT 'cutout',
      sort_order     INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_products_house ON products(house, sort_order);

    CREATE TABLE IF NOT EXISTS partner_applications (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'new',
      ref_code   TEXT UNIQUE,
      note       TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_partners_status ON partner_applications(status, id DESC);
  `);
}
