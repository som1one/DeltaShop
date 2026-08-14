import "server-only";
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { getPool, initDb } from "./db";
import { findById, type User } from "./users";

/**
 * Пароли и сессии покупателей.
 *
 * Пароль хранится как scrypt-хеш со своей солью — внешних зависимостей для
 * этого не нужно. Сессия — случайный токен в httpOnly-куке; в базе лежит его
 * SHA-256, поэтому по дампу таблицы войти нельзя.
 *
 * Писать куку можно только из route handler'а: рендер страницы заголовки
 * ответа уже не меняет.
 */

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "fv_session";
const SESSION_DAYS = 30;
const KEYLEN = 64;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

/* ————————————————————————— пароли ————————————————————————— */

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(plain, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Пустышка для входа с несуществующей почтой: проверка занимает столько же
 * времени, сколько настоящая, и по задержке ответа нельзя узнать, заведён
 * такой покупатель или нет.
 */
export const DUMMY_PASSWORD_HASH = `scrypt$${randomBytes(16).toString(
  "hex",
)}$${randomBytes(KEYLEN).toString("hex")}`;

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(plain, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ————————————————————————— сессии ————————————————————————— */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

let ready = false;
async function ensureReady(): Promise<void> {
  if (!ready) {
    await initDb();
    ready = true;
  }
}

export async function createSession(
  userId: number,
): Promise<{ token: string; expiresAt: Date }> {
  await ensureReady();
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 3600 * 1000);
  const pool = getPool();
  await pool.query(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [hashToken(token), userId, now.toISOString(), expiresAt.toISOString()],
  );
  /* Заодно подметаем протухшие — отдельная задача по расписанию ради этого
     не нужна. */
  await pool.query("DELETE FROM sessions WHERE expires_at < $1", [
    now.toISOString(),
  ]);
  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await ensureReady();
  const pool = getPool();
  await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
    hashToken(token),
  ]);
}

/** Все сессии покупателя — после смены пароля и сброса из админки. */
export async function destroyAllSessions(userId: number): Promise<void> {
  await ensureReady();
  const pool = getPool();
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

async function userByToken(token: string): Promise<User | null> {
  await ensureReady();
  const pool = getPool();
  const res = await pool.query(
    "SELECT user_id, expires_at FROM sessions WHERE token_hash = $1",
    [hashToken(token)],
  );
  const row = res.rows[0] as { user_id: number; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }
  return findById(row.user_id);
}

/** Текущий покупатель или null. Читает куку — годится и в рендере, и в API. */
export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await userByToken(token);
  } catch (e) {
    console.error("не удалось проверить сессию", e);
    return null;
  }
}

/* ——————————————————————— кука сессии ——————————————————————— */

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Вход и регистрация одним движением: сессия + кука. */
export async function startSession(userId: number): Promise<void> {
  const { token, expiresAt } = await createSession(userId);
  await setSessionCookie(token, expiresAt);
}

/* ———————————————————— защита от перебора ———————————————————— */

/**
 * Счётчик неудачных входов на почту, в памяти процесса. Сайт живёт в одном
 * контейнере, поэтому этого хватает; при масштабировании счётчик переедет
 * в базу или Redis.
 */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export function isRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (entry.until < Date.now()) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function noteFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.until < now) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
