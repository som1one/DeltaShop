import "server-only";
import { randomBytes } from "crypto";
import { getPool, initDb } from "./db";

/**
 * Участники партнёрской программы.
 *
 * Одна строка — один участник: сначала заявка, после одобрения она же
 * становится партнёром и получает код. Код выдаётся ровно один раз и
 * дальше не меняется — уже опубликованные ссылки обязаны работать.
 *
 * Деньги живут отдельно, в partner-ledger.ts: здесь только «кто участвует».
 * Писем сайт не отправляет, поэтому решение админа партнёр видит в кабинете.
 */

export type PartnerStatus = "new" | "approved" | "rejected";

/** Куда переводить вознаграждение. Номера карт не храним принципиально. */
export type PayoutMethod = "sbp" | "account";

/** Кому ИП может платить без обязанностей налогового агента. */
export type TaxStatus = "self_employed" | "ip";

export type Partner = {
  id: number;
  userId: number | null;
  name: string;
  email: string;
  status: PartnerStatus;
  refCode: string | null;
  /** Комментарий администратора: причина отказа или заметка */
  note: string | null;
  /** Ответ на вопрос «почему мы должны выбрать вас», если его задавали */
  motivation: string | null;
  rulesVersion: string | null;
  payoutMethod: PayoutMethod | null;
  payoutTarget: string | null;
  payoutName: string | null;
  taxStatus: TaxStatus | null;
  taxId: string | null;
  /** Когда реквизиты выплаты меняли в последний раз */
  payoutUpdatedAt: string | null;
  createdAt: string;
  decidedAt: string | null;
  updatedAt: string;
};

type Row = {
  id: number;
  user_id: number | null;
  name: string;
  email: string;
  status: string;
  ref_code: string | null;
  note: string | null;
  motivation: string | null;
  rules_version: string | null;
  payout_method: string | null;
  payout_target: string | null;
  payout_name: string | null;
  tax_status: string | null;
  tax_id: string | null;
  payout_updated_at: string | null;
  created_at: string;
  decided_at: string | null;
  updated_at: string;
};

function toPartner(row: Row): Partner {
  const status: PartnerStatus =
    row.status === "approved"
      ? "approved"
      : row.status === "rejected"
        ? "rejected"
        : "new";
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    status,
    refCode: row.ref_code,
    note: row.note,
    motivation: row.motivation,
    rulesVersion: row.rules_version,
    payoutMethod:
      row.payout_method === "sbp" || row.payout_method === "account"
        ? row.payout_method
        : null,
    payoutTarget: row.payout_target,
    payoutName: row.payout_name,
    taxStatus:
      row.tax_status === "self_employed" || row.tax_status === "ip"
        ? row.tax_status
        : null,
    taxId: row.tax_id,
    payoutUpdatedAt: row.payout_updated_at,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
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

/** Приводит код из ссылки к каноническому виду; мусор отсекается. */
export function normalizeRefCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (code.length !== 8) return null;
  for (const ch of code) if (!ALPHABET.includes(ch)) return null;
  return code;
}

/**
 * Почта для сравнения «свой заказ»: регистр, плюс-адресация и точки в
 * gmail не должны помогать выписать вознаграждение самому себе.
 */
export function canonicalEmail(email: string): string {
  const [rawLocal = "", domain = ""] = email.trim().toLowerCase().split("@");
  const local = rawLocal.split("+")[0];
  const flat = domain === "gmail.com" ? local.replace(/\./g, "") : local;
  return `${flat}@${domain}`;
}

export const RULES_VERSION = "2026-08-14";

/** Кука с кодом партнёра: ставит её только маршрут /r/[code]. */
export const REF_COOKIE = "fv_ref";

/**
 * Заводит участника. В режиме «по заявке» он рождается со статусом «новая»
 * и без кода; в автоматическом — сразу одобренным и с кодом, потому что
 * рассматривать некому и нечего.
 *
 * Код уникален на уровне базы, поэтому вставку повторяем при столкновении:
 * генератор случайный, и совпадение теоретически возможно.
 */
export async function createApplication(input: {
  userId: number;
  name: string;
  email: string;
  rulesVersion: string;
  motivation?: string | null;
  auto?: boolean;
}): Promise<Partner> {
  await ensureReady();
  const pool = getPool();
  const now = new Date().toISOString();
  const values = [
    input.userId,
    input.name.slice(0, 120),
    input.email.toLowerCase().slice(0, 200),
    input.rulesVersion,
    now,
    input.motivation?.trim().slice(0, 1000) || null,
  ];

  if (!input.auto) {
    const res = await pool.query(
      `INSERT INTO partner_applications
         (user_id, name, email, status, rules_version, rules_accepted_at,
          created_at, updated_at, motivation)
       VALUES ($1, $2, $3, 'new', $4, $5, $5, $5, $6)
       RETURNING *`,
      values,
    );
    return toPartner(res.rows[0] as Row);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await pool.query(
        `INSERT INTO partner_applications
           (user_id, name, email, status, rules_version, rules_accepted_at,
            created_at, updated_at, motivation, ref_code, decided_at)
         VALUES ($1, $2, $3, 'approved', $4, $5, $5, $5, $6, $7, $5)
         RETURNING *`,
        [...values, makeRefCode()],
      );
      return toPartner(res.rows[0] as Row);
    } catch (e) {
      if ((e as { code?: string }).code !== "23505") throw e;
    }
  }
  throw new Error("не удалось выдать уникальный код партнёра");
}

export async function findById(id: number): Promise<Partner | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT * FROM partner_applications WHERE id = $1",
    [id],
  );
  const row = res.rows[0] as Row | undefined;
  return row ? toPartner(row) : null;
}

export async function findByUserId(userId: number): Promise<Partner | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT * FROM partner_applications WHERE user_id = $1",
    [userId],
  );
  const row = res.rows[0] as Row | undefined;
  return row ? toPartner(row) : null;
}

/** Партнёр по коду из ссылки — только одобренный: остальные коды не работают. */
export async function findActiveByRefCode(
  code: string,
): Promise<Partner | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT * FROM partner_applications WHERE ref_code = $1 AND status = 'approved'",
    [code],
  );
  const row = res.rows[0] as Row | undefined;
  return row ? toPartner(row) : null;
}

export async function findByRefCode(code: string): Promise<Partner | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT * FROM partner_applications WHERE ref_code = $1",
    [code],
  );
  const row = res.rows[0] as Row | undefined;
  return row ? toPartner(row) : null;
}

/**
 * Реквизиты выплаты: куда перевести и кому. Ни налогового статуса, ни ИНН
 * здесь нет — они нигде не показываются, а значит и спрашивать их незачем:
 * лишние персональные данные проще не собирать, чем потом охранять.
 */
export async function updatePayoutDetails(
  id: number,
  patch: {
    method: PayoutMethod;
    target: string;
    name: string;
  },
): Promise<Partner | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    `UPDATE partner_applications
       SET payout_method = $2, payout_target = $3, payout_name = $4,
           payout_updated_at = $5, updated_at = $5
     WHERE id = $1 RETURNING *`,
    [
      id,
      patch.method,
      patch.target.trim().slice(0, 60),
      patch.name.trim().slice(0, 120),
      new Date().toISOString(),
    ],
  );
  const row = res.rows[0] as Row | undefined;
  return row ? toPartner(row) : null;
}

/** Налоговый статус партнёра — решение администратора, не покупателя. */
export async function setTaxStatus(
  id: number,
  status: TaxStatus,
): Promise<Partner | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    `UPDATE partner_applications SET tax_status = $2, updated_at = $3
      WHERE id = $1 RETURNING *`,
    [id, status, new Date().toISOString()],
  );
  const row = res.rows[0] as Row | undefined;
  return row ? toPartner(row) : null;
}

/** ИНН уже привязан к другому участнику — на уровне базы, а не проверкой. */
export class TaxIdTakenError extends Error {}

/**
 * Привязка старой заявки к учётной записи — только руками администратора.
 * Автоматически по совпадению почты делать нельзя: почта при регистрации
 * не подтверждается, и чужой код вместе с деньгами достался бы тому, кто
 * первым зарегистрируется на этот адрес.
 */
export async function linkToUser(
  id: number,
  userId: number,
): Promise<Partner | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    `UPDATE partner_applications SET user_id = $2, updated_at = $3
      WHERE id = $1 AND user_id IS NULL RETURNING *`,
    [id, userId, new Date().toISOString()],
  );
  const row = res.rows[0] as Row | undefined;
  return row ? toPartner(row) : null;
}

export async function adminList(limit = 200): Promise<Partner[]> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT * FROM partner_applications ORDER BY id DESC LIMIT $1",
    [limit],
  );
  return (res.rows as Row[]).map(toPartner);
}

export async function adminUpdate(
  id: number,
  patch: { status?: PartnerStatus; note?: string | null },
): Promise<Partner | null> {
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
  const now = new Date().toISOString();
  const decidedAt = patch.status && patch.status !== "new" ? now : row.decided_at;

  /* Код выдаётся один раз при первом одобрении и дальше не меняется —
     иначе уже разосланная ссылка перестанет работать. Совпадение кода
     теоретически возможно, поэтому пробуем несколько раз. */
  if (status === "approved" && !row.ref_code) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await pool.query(
          `UPDATE partner_applications
             SET status = $2, note = $3, ref_code = $4, decided_at = $5,
                 updated_at = $5
           WHERE id = $1 RETURNING *`,
          [id, status, note, makeRefCode(), now],
        );
        return toPartner(res.rows[0] as Row);
      } catch (e) {
        if ((e as { code?: string }).code !== "23505") throw e;
      }
    }
    throw new Error("не удалось выдать уникальный код партнёра");
  }

  const res = await pool.query(
    `UPDATE partner_applications
       SET status = $2, note = $3, decided_at = $4, updated_at = $5
     WHERE id = $1 RETURNING *`,
    [id, status, note, decidedAt, now],
  );
  return toPartner(res.rows[0] as Row);
}
