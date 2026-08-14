import "server-only";
import { getPool, initDb } from "./db";

/**
 * Настройки, которые владелец меняет из админки. Живут в базе, а не в
 * переменных окружения: переключатель не должен требовать пересборки образа
 * и перезапуска магазина.
 */

let ready = false;
async function ensureReady(): Promise<void> {
  if (!ready) {
    await initDb();
    ready = true;
  }
}

async function readAll(keys: string[]): Promise<Record<string, string>> {
  await ensureReady();
  const res = await getPool().query(
    "SELECT key, value FROM app_settings WHERE key = ANY($1::text[])",
    [keys],
  );
  const out: Record<string, string> = {};
  for (const row of res.rows as { key: string; value: string }[]) {
    out[row.key] = row.value;
  }
  return out;
}

async function write(key: string, value: string): Promise<void> {
  await ensureReady();
  await getPool().query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3`,
    [key, value, new Date().toISOString()],
  );
}

/**
 * Как попадают в партнёры:
 *  review — заявку рассматривает человек (по умолчанию);
 *  auto   — ссылка выдаётся сразу по нажатию кнопки.
 */
export type PartnerMode = "review" | "auto";

export type PartnerSettings = {
  mode: PartnerMode;
  /** Спрашивать «почему мы должны выбрать вас» */
  askMotivation: boolean;
};

const KEY_MODE = "partner.mode";
const KEY_MOTIVATION = "partner.ask_motivation";

export async function getPartnerSettings(): Promise<PartnerSettings> {
  const values = await readAll([KEY_MODE, KEY_MOTIVATION]);
  return {
    mode: values[KEY_MODE] === "auto" ? "auto" : "review",
    askMotivation: values[KEY_MOTIVATION] === "1",
  };
}

export async function setPartnerSettings(
  patch: Partial<PartnerSettings>,
): Promise<PartnerSettings> {
  if (patch.mode) await write(KEY_MODE, patch.mode);
  if (patch.askMotivation !== undefined) {
    await write(KEY_MOTIVATION, patch.askMotivation ? "1" : "0");
  }
  return getPartnerSettings();
}
