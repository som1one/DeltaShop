import "server-only";
import { randomBytes } from "crypto";
import { getPool, initDb } from "./db";
import { computeTotalRub, nextInvId } from "./pricing";
import { getProduct } from "./products-store";
import {
  accrueForPaidOrder,
  cancelAccrual,
  restoreCancelledAccrual,
  shiftRipeToDelivery,
  verifyAccrual,
} from "./partner-ledger";
import type { CartLine } from "./cart";

/** Поток: заказ оформлен → оплачен → принят в работу → отправлен → доставлен. */
export type OrderStatus =
  | "new"
  | "paid"
  | "accepted"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderItem = {
  productId: string;
  size: string | null;
  qty: number;
  priceRub: number;
};

export type Order = {
  invId: number;
  token: string;
  status: OrderStatus;
  /** Владелец заказа; null — заказы, оформленные до появления учёток */
  userId: number | null;
  name: string;
  email: string;
  phone: string;
  region: "cis" | "intl";
  city: string;
  address: string;
  culture: "ru" | "en";
  totalRub: number;
  items: OrderItem[];
  track: string | null;
  /** Комментарий администратора к каждому этапу: { shipped: "…" } */
  stageNotes: Record<string, string>;
  /** Код партнёра из ссылки — снимок на момент оформления */
  refCode: string | null;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
};

type Row = {
  inv_id: number;
  token: string;
  status: string;
  user_id: number | null;
  name: string;
  email: string;
  phone: string;
  region: string;
  city: string;
  address: string;
  culture: string;
  total_rub: number;
  items_json: string;
  track: string | null;
  stage_notes_json: string | null;
  ref_code: string | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  updated_at: string;
};

function parseNotes(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function toOrder(row: Row): Order {
  return {
    invId: row.inv_id,
    token: row.token,
    status: row.status as OrderStatus,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    region: row.region === "intl" ? "intl" : "cis",
    city: row.city,
    address: row.address,
    culture: row.culture === "en" ? "en" : "ru",
    totalRub: row.total_rub,
    items: JSON.parse(row.items_json) as OrderItem[],
    track: row.track,
    stageNotes: parseNotes(row.stage_notes_json),
    refCode: row.ref_code,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    deliveredAt: row.delivered_at,
    updatedAt: row.updated_at,
  };
}

/** Ensure the orders table exists before first query. */
let _initialized = false;
async function ensureInit(): Promise<void> {
  if (!_initialized) {
    await initDb();
    _initialized = true;
  }
}

export async function createOrder(input: {
  lines: CartLine[];
  userId: number;
  name: string;
  email: string;
  phone: string;
  region: "cis" | "intl";
  city: string;
  address: string;
  culture: "ru" | "en";
  /** Код партнёра из куки; дальше он в заказе не меняется */
  refCode?: string | null;
}): Promise<Order> {
  await ensureInit();
  const items: OrderItem[] = [];
  for (const line of input.lines) {
    const product = await getProduct(line.productId);
    if (!product) continue;
    items.push({
      productId: line.productId,
      size: line.size,
      qty: Math.min(Math.max(Math.trunc(line.qty), 1), 9),
      priceRub: product.priceRub,
    });
  }
  const totalRub = await computeTotalRub(input.lines);
  const invId = nextInvId();
  const token = randomBytes(16).toString("hex");
  const now = new Date().toISOString();

  const pool = getPool();
  await pool.query(
    `INSERT INTO orders
       (inv_id, token, status, user_id, name, email, phone, region, city,
        address, culture, total_rub, items_json, ref_code, created_at,
        updated_at)
     VALUES ($1, $2, 'new', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
             $14, $15)`,
    [
      invId,
      token,
      input.userId,
      input.name,
      input.email.toLowerCase(),
      input.phone,
      input.region,
      input.city,
      input.address,
      input.culture,
      totalRub,
      JSON.stringify(items),
      input.refCode ?? null,
      now,
      now,
    ],
  );

  return (await getByInvId(invId))!;
}

/** Заказы одной учётки — лента кабинета, свежие сверху. */
export async function listByUser(
  userId: number,
  limit = 100,
): Promise<Order[]> {
  await ensureInit();
  const pool = getPool();
  const res = await pool.query(
    "SELECT * FROM orders WHERE user_id = $1 ORDER BY inv_id DESC LIMIT $2",
    [userId, Math.min(Math.max(limit, 1), 500)],
  );
  return (res.rows as Row[]).map(toOrder);
}

export async function getByInvId(invId: number): Promise<Order | null> {
  await ensureInit();
  const pool = getPool();
  const res = await pool.query("SELECT * FROM orders WHERE inv_id = $1", [invId]);
  const row = res.rows[0] as Row | undefined;
  return row ? toOrder(row) : null;
}

export async function getByToken(token: string): Promise<Order | null> {
  await ensureInit();
  const pool = getPool();
  const res = await pool.query("SELECT * FROM orders WHERE token = $1", [token]);
  const row = res.rows[0] as Row | undefined;
  return row ? toOrder(row) : null;
}

/** Код отслеживания — первые 8 знаков токена. Ищем по префиксу; при
    коллизии (теоретической) отвечаем «не найдено», чтобы не отдать чужой. */
export async function findTokenByCode(code: string): Promise<string | null> {
  await ensureInit();
  const normalized = code.trim().toLowerCase().replace(/[^a-f0-9]/g, "");
  if (normalized.length < 8) return null;
  const pool = getPool();
  const res = await pool.query(
    "SELECT token FROM orders WHERE token LIKE $1 LIMIT 2",
    [normalized + "%"],
  );
  const rows = res.rows as { token: string }[];
  return rows.length === 1 ? rows[0].token : null;
}

export async function findTokenByNumberEmail(
  invId: number,
  email: string,
): Promise<string | null> {
  await ensureInit();
  const pool = getPool();
  const res = await pool.query(
    "SELECT token FROM orders WHERE inv_id = $1 AND email = $2",
    [invId, email.toLowerCase()],
  );
  const row = res.rows[0] as { token: string } | undefined;
  return row?.token ?? null;
}

/**
 * Откуда пришло подтверждение оплаты. От этого зависит судьба партнёрского
 * начисления: деньги печатаются только там, где оплата проверена.
 *  yookassa  — вебхук, состояние платежа перечитано у самой ЮKassa;
 *  robokassa — подпись верна, но сумма с заказом не сверяется → ручная проверка.
 *
 * Оплату без провайдера сюда не приносят вовсе: пока ключи не заданы, заказ
 * остаётся неоплаченным, а «оплачен вручную» проставляется в админке.
 */
export type PaidSource = "yookassa" | "robokassa";

/**
 * Помечает заказ оплаченным и в ТОЙ ЖЕ транзакции начисляет партнёрское
 * вознаграждение. Разнести их нельзя: между двумя запросами появляется
 * окно, в котором заказ оплачен, а денег партнёра не существует.
 */
export async function markPaid(
  invId: number,
  source: PaidSource,
): Promise<boolean> {
  await ensureInit();
  const now = new Date().toISOString();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    /* Вебхук ЮKassa приходит с повторами и может опоздать: к этому моменту
       администратор уже мог перевести заказ в «принят» или «отправлен».
       Поэтому статус двигаем только из 'new', а отметку об оплате ставим
       в любом случае — иначе оплаченный заказ остаётся без paid_at и без
       партнёрского начисления навсегда. */
    const res = await client.query(
      `UPDATE orders
          SET status     = CASE WHEN status = 'new' THEN 'paid' ELSE status END,
              paid_at    = COALESCE(paid_at, $1),
              updated_at = $2
        WHERE inv_id = $3 AND status <> 'cancelled'
        RETURNING ref_code, total_rub, user_id, email, delivered_at, paid_at,
                  (paid_at = $1) AS just_paid`,
      [now, now, invId],
    );
    const row = res.rows[0] as
      | {
          ref_code: string | null;
          total_rub: number;
          user_id: number | null;
          email: string;
          delivered_at: string | null;
          paid_at: string;
          just_paid: boolean;
        }
      | undefined;

    /* Заказа нет или он отменён — платить нечему */
    if (!row) {
      await client.query("ROLLBACK");
      console.warn(`Оплата №${invId} (${source}): заказ не найден или отменён`);
      return false;
    }

    if (row.ref_code) {
      /* Вставка идемпотентна по первичному ключу, поэтому вызываем её и на
         повторном вебхуке: если начисления ещё нет, оно появится. */
      await accrueForPaidOrder(client, {
        invId,
        refCode: row.ref_code,
        baseRub: row.total_rub,
        orderUserId: row.user_id,
        orderEmail: row.email,
        paidAt: row.paid_at,
        deliveredAt: row.delivered_at,
        verified: source === "yookassa",
      });
      /* Оплату, помеченную руками, настоящий вебхук подтверждает задним
         числом — начисление выходит из ручной проверки само. */
      if (source === "yookassa") await verifyAccrual(client, invId);
    }

    await client.query("COMMIT");
    return row.just_paid;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function adminList(
  opts: {
    search?: string;
    status?: OrderStatus | "all";
    limit?: number;
  } = {},
): Promise<Order[]> {
  await ensureInit();
  const pool = getPool();
  const where: string[] = [];
  const args: unknown[] = [];

  if (opts.status && opts.status !== "all") {
    args.push(opts.status);
    where.push(`status = $${args.length}`);
  }
  const search = opts.search?.trim();
  if (search) {
    args.push(`%${search.toLowerCase()}%`);
    const like = `$${args.length}`;
    /* Номер заказа набирают и как «123», и как «№123» — поэтому ищем
       по тексту номера наравне с почтой, именем, городом и треком. */
    where.push(
      `(LOWER(name) LIKE ${like} OR LOWER(email) LIKE ${like}
        OR LOWER(city) LIKE ${like} OR LOWER(COALESCE(track, '')) LIKE ${like}
        OR inv_id::text LIKE ${like})`,
    );
  }
  args.push(Math.min(Math.max(opts.limit ?? 200, 1), 1000));

  const res = await pool.query(
    `SELECT * FROM orders
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY inv_id DESC LIMIT $${args.length}`,
    args,
  );
  return (res.rows as Row[]).map(toOrder);
}

export async function adminUpdate(
  invId: number,
  patch: {
    status?: OrderStatus;
    track?: string | null;
    /** Комментарий к одному этапу; пустой текст убирает его */
    stageNote?: { stage: string; text: string | null };
  },
): Promise<Order | null> {
  await ensureInit();
  const order = await getByInvId(invId);
  if (!order) return null;
  const status = patch.status ?? order.status;
  const track = patch.track === undefined ? order.track : patch.track;

  const notes = { ...order.stageNotes };
  if (patch.stageNote) {
    const text = patch.stageNote.text?.trim();
    if (text) notes[patch.stageNote.stage] = text;
    else delete notes[patch.stageNote.stage];
  }

  const now = new Date().toISOString();
  /* Дата доставки проставляется один раз: от неё считается срок, после
     которого партнёрское начисление можно выплачивать. */
  const deliveredAt =
    status === "delivered" ? (order.deliveredAt ?? now) : order.deliveredAt;
  /* Оплату можно проставить и руками — деньги пришли переводом или вебхук
     ЮKassa не настроен. Ловим это по отсутствию отметки об оплате, а не по
     переходу «new → paid»: администратор вправе сразу поставить «отправлен».
     Провайдер такую оплату не подтверждал, поэтому начисление уходит в
     ручную проверку, а не сразу в деньги. */
  const PAID_STAGES: OrderStatus[] = ["paid", "accepted", "shipped", "delivered"];
  const paidByHand = order.paidAt === null && PAID_STAGES.includes(status);
  const paidAt = paidByHand ? now : order.paidAt;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE orders SET status = $1, track = $2, stage_notes_json = $3,
         delivered_at = $4, paid_at = $5, updated_at = $6 WHERE inv_id = $7`,
      [
        status,
        track,
        Object.keys(notes).length ? JSON.stringify(notes) : null,
        deliveredAt,
        paidAt,
        now,
        invId,
      ],
    );

    /* Начисление рождается в той же транзакции, что и отметка об оплате:
       иначе появляется окно, в котором заказ оплачен, а денег партнёра нет,
       и повторить это действие уже нечем. */
    if (paidByHand && order.refCode) {
      await accrueForPaidOrder(client, {
        invId,
        refCode: order.refCode,
        baseRub: order.totalRub,
        orderUserId: order.userId,
        orderEmail: order.email,
        paidAt: now,
        deliveredAt,
        verified: false,
      });
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  /* Судьба партнёрского начисления идёт следом за статусом заказа */
  if (order.refCode) {
    if (status === "cancelled") await cancelAccrual(invId, "order_cancelled");
    else {
      /* Заказ вернули из отмены — значит, отменяли по ошибке */
      if (order.status === "cancelled") await restoreCancelledAccrual(invId);
      if (status === "delivered" && deliveredAt) {
        await shiftRipeToDelivery(invId, deliveredAt);
      }
    }
  }
  return getByInvId(invId);
}
