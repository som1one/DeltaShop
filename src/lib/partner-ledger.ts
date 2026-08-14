import "server-only";
import { createHash } from "crypto";
import type { PoolClient } from "pg";
import { getPool, initDb } from "./db";
import { canonicalEmail } from "./partners";

/**
 * Деньги партнёрской программы: переходы, начисления, выплаты.
 *
 * Три правила, из которых растёт всё остальное:
 *  1. Начисление рождается ровно один раз на заказ — это гарантирует
 *     первичный ключ таблицы, а не порядок вызовов.
 *  2. Баланс нигде не хранится: это всегда сумма по журналу начислений.
 *  3. Начисление созревает по времени (ripe_at), а не по расписанию —
 *     планировщика в проекте нет, и зависеть от него деньги не должны.
 */

/** Доля партнёра. Хранится в каждой строке начисления: правка процента
    завтра не должна переписывать вчерашние деньги. */
export const PARTNER_RATE_PERCENT = 25;

/** Кука с кодом живёт месяц — столько же засчитывается переход. */
export const ATTRIBUTION_DAYS = 30;

/** Возврат считается от получения посылки; без отметки о доставке
    начисление созревает по страховочному сроку. */
const HOLD_AFTER_DELIVERY_DAYS = 14;
const HOLD_FALLBACK_DAYS = 45;

export type AccrualStatus = "pending" | "review" | "paid" | "cancelled";

/** Почему начисление отменено или ждёт ручной проверки. */
export type AccrualReason =
  | "self"
  | "order_cancelled"
  | "unverified"
  | "admin"
  | "restored";

export type Accrual = {
  invId: number;
  refCode: string;
  amountKop: number;
  baseRub: number;
  ratePercent: number;
  status: AccrualStatus;
  reason: AccrualReason | null;
  ripeAt: string;
  payoutId: number | null;
  createdAt: string;
  /** Дата и сумма самого заказа — для строки в кабинете */
  orderTotalRub: number;
  orderCreatedAt: string;
};

export type Payout = {
  id: number;
  amountKop: number;
  method: string | null;
  target: string | null;
  note: string | null;
  /** Путь к чеку в томе загрузок, если он приложен */
  receiptPath: string | null;
  createdAt: string;
  cancelledAt: string | null;
};

export type PartnerStats = {
  clicks30: number;
  clicksTotal: number;
  orders: number;
  accruedKop: number;
  holdKop: number;
  payableKop: number;
  paidKop: number;
  cancelledKop: number;
};

let ready = false;
async function ensureReady(): Promise<void> {
  if (!ready) {
    await initDb();
    ready = true;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

function plusDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86400_000).toISOString();
}

/* ————————————————————————— переходы ————————————————————————— */

/**
 * Посетитель без хранения адреса: соль берём из ключа админки, чтобы хеш
 * нельзя было подобрать по списку адресов. Меняется соль — обнуляется
 * только дедупликация, деньги от этого не зависят.
 *
 * В хеш идёт только адрес и день: если добавить браузер, накрутить переходы
 * можно было бы простым перебором User-Agent с одного адреса.
 */
export function visitorHash(ip: string, day: string): string {
  const salt = process.env.ADMIN_PASSWORD ?? "forma-visual";
  return createHash("sha256")
    .update(`${salt}|${ip}|${day}`)
    .digest("hex")
    .slice(0, 32);
}

/** Один посетитель в сутки — одна строка; повторные заходы копятся в hits. */
export async function recordClick(
  refCode: string,
  visitor: string,
): Promise<void> {
  await ensureReady();
  const pool = getPool();
  await pool.query(
    `INSERT INTO partner_clicks (ref_code, visitor, day, hits, created_at)
     VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (ref_code, visitor, day) DO UPDATE
       SET hits = partner_clicks.hits + 1`,
    [refCode, visitor, today(), new Date().toISOString()],
  );
}

/* ————————————————————————— начисления ————————————————————————— */

export function commissionKop(baseRub: number, rate = PARTNER_RATE_PERCENT) {
  return Math.round(baseRub * rate);
}

/**
 * Начисление по оплаченному заказу. Вызывается ВНУТРИ той же транзакции,
 * что и пометка заказа оплаченным: иначе появляется окно, в котором заказ
 * оплачен, а денег партнёра не существует.
 *
 * Не начисляем и записываем причину, вместо того чтобы промолчать:
 * исчезнувшая без следа сумма читается партнёром как обман.
 */
export async function accrueForPaidOrder(
  client: PoolClient,
  input: {
    invId: number;
    refCode: string;
    baseRub: number;
    orderUserId: number | null;
    orderEmail: string;
    paidAt: string;
    deliveredAt: string | null;
    /** Проверена ли оплата провайдером по-настоящему */
    verified: boolean;
  },
): Promise<void> {
  const found = await client.query(
    `SELECT id, user_id, email, status FROM partner_applications
      WHERE ref_code = $1`,
    [input.refCode],
  );
  const partner = found.rows[0] as
    | { id: number; user_id: number | null; email: string; status: string }
    | undefined;
  /* Код из куки больше не действует (заявку отклонили) — молча ничего не
     начисляем: партнёра с таким кодом нет. */
  if (!partner || partner.status !== "approved") return;

  const own =
    (partner.user_id !== null && partner.user_id === input.orderUserId) ||
    canonicalEmail(partner.email) === canonicalEmail(input.orderEmail);

  const status: AccrualStatus = own
    ? "cancelled"
    : input.verified
      ? "pending"
      : "review";
  const reason: AccrualReason | null = own
    ? "self"
    : input.verified
      ? null
      : "unverified";

  const ripeAt = input.deliveredAt
    ? plusDays(input.deliveredAt, HOLD_AFTER_DELIVERY_DAYS)
    : plusDays(input.paidAt, HOLD_FALLBACK_DAYS);
  const now = new Date().toISOString();

  await client.query(
    `INSERT INTO partner_accruals
       (order_inv_id, ref_code, amount_kop, base_rub, rate_percent, status,
        reason, ripe_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     ON CONFLICT (order_inv_id) DO NOTHING`,
    [
      input.invId,
      input.refCode,
      commissionKop(input.baseRub),
      input.baseRub,
      PARTNER_RATE_PERCENT,
      status,
      reason,
      ripeAt,
      now,
    ],
  );
}

/**
 * Оплата подтверждена провайдером задним числом: начисление, помеченное
 * оплатой вручную, выходит из ручной проверки. Отменённое (например,
 * самореферал) при этом не воскресает.
 */
export async function verifyAccrual(
  client: PoolClient,
  invId: number,
): Promise<void> {
  await client.query(
    `UPDATE partner_accruals
       SET status = 'pending', reason = NULL, updated_at = $2
     WHERE order_inv_id = $1 AND status = 'review' AND reason = 'unverified'`,
    [invId, new Date().toISOString()],
  );
}

/** Заказ отменили — начисление гаснет, но остаётся видимым с причиной. */
export async function cancelAccrual(
  invId: number,
  reason: AccrualReason,
): Promise<void> {
  await ensureReady();
  const pool = getPool();
  await pool.query(
    `UPDATE partner_accruals
       SET status = 'cancelled', reason = $2, updated_at = $3
     WHERE order_inv_id = $1 AND status IN ('pending', 'review')`,
    [invId, reason, new Date().toISOString()],
  );
}

/**
 * Заказ вернули из отмены — значит, отменяли по ошибке. Начисление,
 * погашенное вместе с заказом, возвращается в очередь: комиссия не должна
 * умирать от одного неверного нажатия в админке.
 */
export async function restoreCancelledAccrual(invId: number): Promise<void> {
  await ensureReady();
  const pool = getPool();
  /* Возвращаем не в очередь на выплату, а в ручную проверку: после
     «отменили — вернули» на деньги должен посмотреть человек. */
  await pool.query(
    `UPDATE partner_accruals
       SET status = 'review', reason = 'restored', updated_at = $2
     WHERE order_inv_id = $1 AND status = 'cancelled'
       AND reason = 'order_cancelled'`,
    [invId, new Date().toISOString()],
  );
}

/** Заказ доставлен — срок проверки отсчитывается от этого дня. */
export async function shiftRipeToDelivery(
  invId: number,
  deliveredAt: string,
): Promise<void> {
  await ensureReady();
  const pool = getPool();
  await pool.query(
    `UPDATE partner_accruals
       SET ripe_at = $2, updated_at = $3
     WHERE order_inv_id = $1 AND status IN ('pending', 'review')`,
    [
      invId,
      plusDays(deliveredAt, HOLD_AFTER_DELIVERY_DAYS),
      new Date().toISOString(),
    ],
  );
}

/** Ручная отмена начисления администратором. */
export async function adminCancelAccrual(invId: number): Promise<void> {
  await cancelAccrual(invId, "admin");
}

/**
 * Начисление, попавшее в ручную проверку, признано настоящим: дальше оно
 * живёт как обычное — ждёт своего срока и уходит в выплату.
 */
export async function approveAccrual(invId: number): Promise<void> {
  await ensureReady();
  const pool = getPool();
  await pool.query(
    `UPDATE partner_accruals
       SET status = 'pending', reason = NULL, updated_at = $2
     WHERE order_inv_id = $1 AND status = 'review'`,
    [invId, new Date().toISOString()],
  );
}

type AccrualRow = {
  order_inv_id: number;
  ref_code: string;
  amount_kop: string | number;
  base_rub: number;
  rate_percent: number;
  status: string;
  reason: string | null;
  ripe_at: string;
  payout_id: number | null;
  created_at: string;
  total_rub: number;
  order_created_at: string;
};

function toAccrual(row: AccrualRow): Accrual {
  return {
    invId: row.order_inv_id,
    refCode: row.ref_code,
    amountKop: Number(row.amount_kop),
    baseRub: row.base_rub,
    ratePercent: row.rate_percent,
    status: row.status as AccrualStatus,
    reason: (row.reason as AccrualReason | null) ?? null,
    ripeAt: row.ripe_at,
    payoutId: row.payout_id,
    createdAt: row.created_at,
    orderTotalRub: row.total_rub,
    orderCreatedAt: row.order_created_at,
  };
}

export async function listAccruals(
  refCode: string,
  limit = 200,
): Promise<Accrual[]> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    `SELECT a.*, o.total_rub, o.created_at AS order_created_at
       FROM partner_accruals a
       JOIN orders o ON o.inv_id = a.order_inv_id
      WHERE a.ref_code = $1
      ORDER BY a.order_inv_id DESC
      LIMIT $2`,
    [refCode, Math.min(Math.max(limit, 1), 500)],
  );
  return (res.rows as AccrualRow[]).map(toAccrual);
}

/* ————————————————————————— сводка ————————————————————————— */

export async function statsFor(refCode: string): Promise<PartnerStats> {
  await ensureReady();
  const pool = getPool();
  const now = new Date().toISOString();

  /* Считаем не заходы, а посетителей: строка — это «адрес + день», поэтому
     обновление страницы в цикле счётчик не растит. */
  const clicks = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE day >= $2) AS recent,
       COUNT(*) AS total
     FROM partner_clicks WHERE ref_code = $1`,
    [refCode, daysAgo(ATTRIBUTION_DAYS)],
  );
  const money = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status <> 'cancelled')                        AS orders,
       COALESCE(SUM(amount_kop) FILTER (WHERE status <> 'cancelled'), 0)    AS accrued,
       COALESCE(SUM(amount_kop) FILTER (WHERE status = 'pending' AND ripe_at > $2), 0) AS hold,
       COALESCE(SUM(amount_kop) FILTER (WHERE status = 'pending' AND ripe_at <= $2), 0) AS payable,
       COALESCE(SUM(amount_kop) FILTER (WHERE status = 'paid'), 0)          AS paid,
       COALESCE(SUM(amount_kop) FILTER (WHERE status = 'cancelled'), 0)     AS cancelled
     FROM partner_accruals WHERE ref_code = $1`,
    [refCode, now],
  );

  const c = clicks.rows[0] as { recent: string; total: string };
  const m = money.rows[0] as Record<string, string>;
  return {
    clicks30: Number(c.recent),
    clicksTotal: Number(c.total),
    orders: Number(m.orders),
    accruedKop: Number(m.accrued),
    holdKop: Number(m.hold),
    payableKop: Number(m.payable),
    paidKop: Number(m.paid),
    cancelledKop: Number(m.cancelled),
  };
}

/* ————————————————————————— выплаты ————————————————————————— */

type PayoutRow = {
  id: number;
  amount_kop: string | number;
  method: string | null;
  target: string | null;
  note: string | null;
  receipt_path: string | null;
  created_at: string;
  cancelled_at: string | null;
};

export async function listPayouts(refCode: string): Promise<Payout[]> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT * FROM partner_payouts WHERE ref_code = $1 ORDER BY id DESC LIMIT 100",
    [refCode],
  );
  return (res.rows as PayoutRow[]).map((row) => ({
    id: row.id,
    amountKop: Number(row.amount_kop),
    method: row.method,
    target: row.target,
    note: row.note,
    receiptPath: row.receipt_path,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  }));
}

/** Чек по переводу: партнёр присылает его после выплаты, админ прикладывает. */
export async function attachReceipt(
  payoutId: number,
  receiptPath: string,
): Promise<boolean> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "UPDATE partner_payouts SET receipt_path = $2 WHERE id = $1",
    [payoutId, receiptPath],
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Собирает выплату из созревших начислений. Всё одной транзакцией с
 * блокировкой строк: двойное нажатие кнопки не выплатит одно и то же дважды.
 */
export async function createPayout(input: {
  refCode: string;
  method: string | null;
  target: string | null;
  note: string | null;
  /** Выплатить не всё, а выбранные начисления */
  invIds?: number[];
}): Promise<{ payoutId: number; amountKop: number; count: number } | null> {
  await ensureReady();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    /* Отменённый заказ в выплату не попадает, даже если его начисление
       когда-то успело созреть: платить 25% за возвращённый товар нельзя.
       Список номеров — способ выплатить часть: фильтр поверх тех же правил,
       поэтому чужое или несозревшее через него не пройдёт. */
    const partial = input.invIds && input.invIds.length > 0;
    const rows = await client.query(
      `SELECT a.order_inv_id, a.amount_kop
         FROM partner_accruals a
         JOIN orders o ON o.inv_id = a.order_inv_id
        WHERE a.ref_code = $1 AND a.status = 'pending' AND a.ripe_at <= $2
          AND o.status <> 'cancelled'
          ${partial ? "AND a.order_inv_id = ANY($3::int[])" : ""}
        FOR UPDATE OF a`,
      partial
        ? [input.refCode, new Date().toISOString(), input.invIds]
        : [input.refCode, new Date().toISOString()],
    );
    const items = rows.rows as { order_inv_id: number; amount_kop: string }[];
    if (items.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const amountKop = items.reduce((sum, r) => sum + Number(r.amount_kop), 0);
    const now = new Date().toISOString();
    const created = await client.query(
      `INSERT INTO partner_payouts
         (ref_code, amount_kop, method, target, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [input.refCode, amountKop, input.method, input.target, input.note, now],
    );
    const payoutId = (created.rows[0] as { id: number }).id;
    await client.query(
      `UPDATE partner_accruals
         SET status = 'paid', payout_id = $2, updated_at = $3
       WHERE order_inv_id = ANY($1::int[])`,
      [items.map((r) => r.order_inv_id), payoutId, now],
    );
    await client.query("COMMIT");
    return { payoutId, amountKop, count: items.length };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Ошиблись кнопкой — начисления возвращаются в очередь. */
export async function cancelPayout(payoutId: number): Promise<boolean> {
  await ensureReady();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const now = new Date().toISOString();
    const res = await client.query(
      `UPDATE partner_payouts SET cancelled_at = $2
        WHERE id = $1 AND cancelled_at IS NULL`,
      [payoutId, now],
    );
    if ((res.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    /* Начисления возвращаются в очередь — кроме тех, чей заказ за это время
       отменили: иначе следующая выплата отдаст деньги за возвращённый товар
       второй раз. Такие строки гаснут здесь же, с причиной. */
    await client.query(
      `UPDATE partner_accruals a
          SET status = CASE WHEN o.status = 'cancelled' THEN 'cancelled'
                            ELSE 'pending' END,
              reason = CASE WHEN o.status = 'cancelled' THEN 'order_cancelled'
                            ELSE a.reason END,
              payout_id = NULL,
              updated_at = $2
         FROM orders o
        WHERE a.payout_id = $1 AND o.inv_id = a.order_inv_id`,
      [payoutId, now],
    );
    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Сводка по всем партнёрам разом — список в админке. */
export async function adminSummary(): Promise<
  Record<string, { orders: number; payableKop: number; accruedKop: number; paidKop: number; clicks: number }>
> {
  await ensureReady();
  const pool = getPool();
  const now = new Date().toISOString();
  const money = await pool.query(
    `SELECT ref_code,
       COUNT(*) FILTER (WHERE status <> 'cancelled')                     AS orders,
       COALESCE(SUM(amount_kop) FILTER (WHERE status <> 'cancelled'), 0) AS accrued,
       COALESCE(SUM(amount_kop) FILTER (WHERE status = 'pending' AND ripe_at <= $1), 0) AS payable,
       COALESCE(SUM(amount_kop) FILTER (WHERE status = 'paid'), 0)       AS paid
     FROM partner_accruals GROUP BY ref_code`,
    [now],
  );
  const clicks = await pool.query(
    "SELECT ref_code, COUNT(*) AS total FROM partner_clicks GROUP BY ref_code",
  );

  const out: Record<
    string,
    { orders: number; payableKop: number; accruedKop: number; paidKop: number; clicks: number }
  > = {};
  for (const row of money.rows as Record<string, string>[]) {
    out[row.ref_code] = {
      orders: Number(row.orders),
      accruedKop: Number(row.accrued),
      payableKop: Number(row.payable),
      paidKop: Number(row.paid),
      clicks: 0,
    };
  }
  for (const row of clicks.rows as Record<string, string>[]) {
    const entry = out[row.ref_code] ?? {
      orders: 0,
      accruedKop: 0,
      payableKop: 0,
      paidKop: 0,
      clicks: 0,
    };
    entry.clicks = Number(row.total);
    out[row.ref_code] = entry;
  }
  return out;
}
