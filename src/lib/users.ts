import "server-only";
import { getPool, initDb } from "./db";

/**
 * Учётные записи покупателей. Пароли сюда попадают уже в виде хеша —
 * хеширование и сессии живут в lib/auth.ts.
 */

export type User = {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  createdAt: string;
};

type Row = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  created_at: string;
  updated_at: string;
};

/** Наружу уходит только то, что можно показать в кабинете. */
function toUser(row: Row): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    city: row.city,
    address: row.address,
    createdAt: row.created_at,
  };
}

let ready = false;
async function ensureReady(): Promise<void> {
  if (!ready) {
    await initDb();
    ready = true;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 200);
}

/** Почта занята — на уровне базы, а не проверкой заранее (гонки). */
export class EmailTakenError extends Error {}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<User> {
  await ensureReady();
  const pool = getPool();
  const now = new Date().toISOString();
  try {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        normalizeEmail(input.email),
        input.passwordHash,
        input.name.trim().slice(0, 120),
        now,
        now,
      ],
    );
    return toUser(res.rows[0] as Row);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new EmailTakenError();
    throw e;
  }
}

/** Для входа: вместе с хешем пароля. */
export async function findForLogin(
  email: string,
): Promise<{ user: User; passwordHash: string } | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query("SELECT * FROM users WHERE email = $1", [
    normalizeEmail(email),
  ]);
  const row = res.rows[0] as Row | undefined;
  return row ? { user: toUser(row), passwordHash: row.password_hash } : null;
}

export async function findById(id: number): Promise<User | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  const row = res.rows[0] as Row | undefined;
  return row ? toUser(row) : null;
}

export async function getPasswordHash(id: number): Promise<string | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT password_hash FROM users WHERE id = $1",
    [id],
  );
  const row = res.rows[0] as { password_hash: string } | undefined;
  return row?.password_hash ?? null;
}

export async function updateProfile(
  id: number,
  patch: { name?: string; phone?: string; city?: string; address?: string },
): Promise<User | null> {
  await ensureReady();
  const current = await findById(id);
  if (!current) return null;
  const name = (patch.name ?? current.name).trim().slice(0, 120);
  const pool = getPool();
  const res = await pool.query(
    `UPDATE users SET name = $2, phone = $3, city = $4, address = $5,
       updated_at = $6 WHERE id = $1 RETURNING *`,
    [
      id,
      name || current.name,
      (patch.phone ?? current.phone).trim().slice(0, 60),
      (patch.city ?? current.city).trim().slice(0, 120),
      (patch.address ?? current.address).trim().slice(0, 300),
      new Date().toISOString(),
    ],
  );
  return toUser(res.rows[0] as Row);
}

/** Дозаполняет пустые поля профиля данными из оформленного заказа. */
export async function fillEmptyProfile(
  id: number,
  values: { name?: string; phone?: string; city?: string; address?: string },
): Promise<void> {
  const current = await findById(id);
  if (!current) return;
  const patch: Parameters<typeof updateProfile>[1] = {};
  if (!current.phone && values.phone) patch.phone = values.phone;
  if (!current.city && values.city) patch.city = values.city;
  if (!current.address && values.address) patch.address = values.address;
  if (Object.keys(patch).length > 0) await updateProfile(id, patch);
}

export async function setPasswordHash(
  id: number,
  passwordHash: string,
): Promise<void> {
  await ensureReady();
  const pool = getPool();
  await pool.query(
    "UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1",
    [id, passwordHash, new Date().toISOString()],
  );
}

/** Список для админки: поиск по почте и имени. */
export async function adminList(
  opts: { search?: string; limit?: number } = {},
): Promise<User[]> {
  await ensureReady();
  const pool = getPool();
  const args: unknown[] = [];
  let where = "";
  const search = opts.search?.trim().toLowerCase();
  if (search) {
    args.push(`%${search}%`);
    where = `WHERE LOWER(email) LIKE $1 OR LOWER(name) LIKE $1`;
  }
  args.push(Math.min(Math.max(opts.limit ?? 200, 1), 1000));
  const res = await pool.query(
    `SELECT * FROM users ${where} ORDER BY id DESC LIMIT $${args.length}`,
    args,
  );
  return (res.rows as Row[]).map(toUser);
}
