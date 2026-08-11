import "server-only";
import { randomBytes } from "crypto";
import { getPool, initDb } from "./db";

/**
 * Заявки в партнёрскую программу. Форма на /partners складывает их сюда,
 * админ одобряет или отклоняет; при одобрении заявке присваивается код,
 * из которого собирается персональная ссылка.
 *
 * Письма пока не уходят — SMTP не подключён, поэтому ссылку админ
 * копирует из кабинета и отправляет сам.
 */

export type PartnerStatus = "new" | "approved" | "rejected";

export type PartnerApplication = {
  id: number;
  name: string;
  email: string;
  status: PartnerStatus;
  refCode: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: number;
  name: string;
  email: string;
  status: string;
  ref_code: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function toApplication(row: Row): PartnerApplication {
  const status: PartnerStatus =
    row.status === "approved"
      ? "approved"
      : row.status === "rejected"
        ? "rejected"
        : "new";
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    status,
    refCode: row.ref_code,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

let ready = false;
async function ensureReady(): Promise<void> {
  if (!ready) {
    await initDb();
    ready = true;
  }
}

/** Код без похожих друг на друга знаков — его диктуют и переписывают руками. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeRefCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export async function createApplication(input: {
  name: string;
  email: string;
}): Promise<PartnerApplication> {
  await ensureReady();
  const pool = getPool();
  const now = new Date().toISOString();
  const res = await pool.query(
    `INSERT INTO partner_applications (name, email, status, created_at, updated_at)
     VALUES ($1, $2, 'new', $3, $4) RETURNING *`,
    [input.name.slice(0, 120), input.email.toLowerCase().slice(0, 200), now, now],
  );
  return toApplication(res.rows[0] as Row);
}

/** Уже подавал заявку и ещё не рассмотрен — второй раз не заводим. */
export async function hasPendingApplication(email: string): Promise<boolean> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT 1 FROM partner_applications WHERE email = $1 AND status = 'new' LIMIT 1",
    [email.toLowerCase()],
  );
  return res.rows.length > 0;
}

export async function adminList(limit = 200): Promise<PartnerApplication[]> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT * FROM partner_applications ORDER BY id DESC LIMIT $1",
    [limit],
  );
  return (res.rows as Row[]).map(toApplication);
}

export async function adminUpdate(
  id: number,
  patch: { status?: PartnerStatus; note?: string | null },
): Promise<PartnerApplication | null> {
  await ensureReady();
  const pool = getPool();
  const cur = await pool.query(
    "SELECT * FROM partner_applications WHERE id = $1",
    [id],
  );
  const row = cur.rows[0] as Row | undefined;
  if (!row) return null;

  const status = patch.status ?? (row.status as PartnerStatus);
  const note = patch.note === undefined ? row.note : patch.note;
  /* Код выдаётся один раз при первом одобрении и дальше не меняется —
     иначе уже разосланная ссылка перестанет работать. */
  const refCode =
    status === "approved" ? (row.ref_code ?? makeRefCode()) : row.ref_code;

  const res = await pool.query(
    `UPDATE partner_applications
       SET status = $2, note = $3, ref_code = $4, updated_at = $5
     WHERE id = $1 RETURNING *`,
    [id, status, note, refCode, new Date().toISOString()],
  );
  return toApplication(res.rows[0] as Row);
}
