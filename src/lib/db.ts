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
  var __fvInitDb: Promise<void> | undefined;
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

/**
 * Создаёт таблицы, если их ещё нет. Вызывается лениво перед первым запросом
 * каждым модулем-хранилищем, поэтому идёт ровно один раз на процесс:
 * параллельные CREATE/ALTER по одним и тем же таблицам Postgres встречает
 * дедлоком.
 */
export function initDb(): Promise<void> {
  if (!globalThis.__fvInitDb) {
    globalThis.__fvInitDb = runInit().catch((e: unknown) => {
      /* Неудачную попытку не запоминаем: следующий запрос попробует снова */
      globalThis.__fvInitDb = undefined;
      throw e;
    });
  }
  return globalThis.__fvInitDb;
}

async function runInit(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    -- Несколько процессов (или воркеров) могут стартовать разом: блокировка
    -- держится до конца этого запроса и разводит их по очереди.
    SELECT pg_advisory_xact_lock(918273645);

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
    -- Комментарии к этапам: {"shipped":"Передан в СДЭК", "delivered":"В пункте выдачи…"}
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS stage_notes_json TEXT;

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

    -- Покупатели. Почта хранится в нижнем регистре и служит логином;
    -- пароль — только как хеш scrypt (см. lib/auth.ts).
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      phone         TEXT NOT NULL DEFAULT '',
      city          TEXT NOT NULL DEFAULT '',
      address       TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    -- Сессии. В базе лежит SHA-256 от токена: утечка таблицы не даёт войти.
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    -- Заказы, оформленные до появления учёток, остаются с NULL и живут
    -- по своей секретной ссылке.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER
      REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, inv_id DESC);

    -- Настройки магазина, которые владелец меняет из админки: пара
    -- «ключ — значение», чтобы не гонять деплой ради переключателя.
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- ——— Партнёрская программа ———
    -- Участник программы — это заявка: одобренная получает код и живёт
    -- дальше как партнёр. Реквизиты выплаты спрашиваем позже, когда
    -- появились деньги, — раньше они не нужны.
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS user_id INTEGER
      REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS decided_at TEXT;
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS rules_version TEXT;
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS rules_accepted_at TEXT;
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS payout_method TEXT;
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS payout_target TEXT;
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS payout_name TEXT;
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS tax_status TEXT;
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS tax_id TEXT;
    -- «Почему мы должны выбрать вас» — необязательный вопрос заявки
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS motivation TEXT;
    -- Когда партнёр в последний раз менял реквизиты: смена номера перед
    -- выплатой — первый признак угнанной учётной записи, и админ обязан
    -- это видеть.
    ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS payout_updated_at TEXT;
    -- Одна заявка на учётную запись; старые заявки без учётки (user_id IS
    -- NULL) под ограничение не попадают.
    CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_user
      ON partner_applications(user_id) WHERE user_id IS NOT NULL;
    -- Десять учёток на одного человека упираются в один ИНН там, где это
    -- и надо ловить, — на деньгах.
    CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_tax_id
      ON partner_applications(tax_id) WHERE tax_id IS NOT NULL;

    -- Метка партнёра на заказе — снимок на момент оформления: смена куки
    -- потом уже ничего не переписывает.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ref_code TEXT;
    -- Момент доставки нужен начислениям: срок возврата считается от него.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TEXT;
    CREATE INDEX IF NOT EXISTS idx_orders_ref ON orders(ref_code, inv_id DESC);

    -- Переходы: одна строка на «код + посетитель + день». Самого посетителя
    -- не храним — только хеш от адреса и браузера с солью.
    CREATE TABLE IF NOT EXISTS partner_clicks (
      ref_code   TEXT NOT NULL,
      visitor    TEXT NOT NULL,
      day        TEXT NOT NULL,
      hits       INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      PRIMARY KEY (ref_code, visitor, day)
    );
    CREATE INDEX IF NOT EXISTS idx_partner_clicks_day
      ON partner_clicks(ref_code, day DESC);

    -- Выплаты объявляются ДО начислений: на них ссылается внешний ключ,
    -- а вся схема выполняется одним запросом.
    CREATE TABLE IF NOT EXISTS partner_payouts (
      id           SERIAL PRIMARY KEY,
      ref_code     TEXT NOT NULL,
      amount_kop   BIGINT NOT NULL,
      method       TEXT,
      target       TEXT,
      note         TEXT,
      created_at   TEXT NOT NULL,
      cancelled_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_partner_payouts_code
      ON partner_payouts(ref_code, id DESC);
    -- Чек самозанятого по переводу: файл лежит в томе загрузок, здесь путь.
    ALTER TABLE partner_payouts ADD COLUMN IF NOT EXISTS receipt_path TEXT;

    -- Начисления. Ровно одно на заказ — это гарантирует первичный ключ, а не
    -- порядок вызовов: повторный вебхук и ручная пометка упираются в него.
    -- Суммы в копейках: 25% от 7 990 ₽ — это 1 997,50 ₽.
    CREATE TABLE IF NOT EXISTS partner_accruals (
      order_inv_id INTEGER PRIMARY KEY REFERENCES orders(inv_id) ON DELETE CASCADE,
      ref_code     TEXT NOT NULL,
      amount_kop   BIGINT NOT NULL,
      base_rub     INTEGER NOT NULL,
      rate_percent INTEGER NOT NULL,
      status       TEXT NOT NULL,
      reason       TEXT,
      ripe_at      TEXT NOT NULL,
      payout_id    INTEGER REFERENCES partner_payouts(id) ON DELETE SET NULL,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_partner_accruals_code
      ON partner_accruals(ref_code, order_inv_id DESC);
  `);
  /* Заявки, поданные старой формой, знают только почту. Связывать их с
     учётными записями автоматически нельзя: почта при регистрации не
     подтверждается, и первый, кто зарегистрируется на чужой адрес,
     унаследовал бы чужой код вместе с деньгами. Связывает администратор
     кнопкой в разделе «Партнёры» — он знает, кому выдавал код. */
}
