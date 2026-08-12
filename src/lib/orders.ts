import "server-only";
import { randomBytes } from "crypto";
import { getPool, initDb } from "./db";
import { computeTotalRub, nextInvId } from "./pricing";
import { getProduct } from "./products-store";
import type { CartLine } from "./cart";

export type OrderStatus = "new" | "paid" | "shipped" | "delivered" | "cancelled";

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
  createdAt: string;
  paidAt: string | null;
  updatedAt: string;
};

type Row = {
  inv_id: number;
  token: string;
  status: string;
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
  created_at: string;
  paid_at: string | null;
  updated_at: string;
};

function toOrder(row: Row): Order {
  return {
    invId: row.inv_id,
    token: row.token,
    status: row.status as OrderStatus,
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
    createdAt: row.created_at,
    paidAt: row.paid_at,
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
  name: string;
  email: string;
  phone: string;
  region: "cis" | "intl";
  city: string;
  address: string;
  culture: "ru" | "en";
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
       (inv_id, token, status, name, email, phone, region, city, address,
        culture, total_rub, items_json, created_at, updated_at)
     VALUES ($1, $2, 'new', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      invId,
      token,
      input.name,
      input.email.toLowerCase(),
      input.phone,
      input.region,
      input.city,
      input.address,
      input.culture,
      totalRub,
      JSON.stringify(items),
      now,
      now,
    ],
  );

  return (await getByInvId(invId))!;
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

export async function markPaid(invId: number): Promise<boolean> {
  await ensureInit();
  const now = new Date().toISOString();
  const pool = getPool();
  const res = await pool.query(
    `UPDATE orders SET status = 'paid', paid_at = $1, updated_at = $2
     WHERE inv_id = $3 AND status = 'new'`,
    [now, now, invId],
  );
  return (res.rowCount ?? 0) > 0;
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
  patch: { status?: OrderStatus; track?: string | null },
): Promise<Order | null> {
  await ensureInit();
  const order = await getByInvId(invId);
  if (!order) return null;
  const status = patch.status ?? order.status;
  const track = patch.track === undefined ? order.track : patch.track;
  const pool = getPool();
  await pool.query(
    "UPDATE orders SET status = $1, track = $2, updated_at = $3 WHERE inv_id = $4",
    [status, track, new Date().toISOString(), invId],
  );
  return getByInvId(invId);
}
