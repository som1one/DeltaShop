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

/** Создаёт таблицу orders, если она ещё не существует. Вызывается при старте. */
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
  `);
}
