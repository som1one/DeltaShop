import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  ATTRIBUTION_DAYS,
  listAccruals,
  listPayouts,
  PARTNER_RATE_PERCENT,
  statsFor,
} from "@/lib/partner-ledger";
import {
  createApplication,
  findByUserId,
  RULES_VERSION,
  updatePayoutDetails,
  type PayoutMethod,
} from "@/lib/partners";
import { getPartnerSettings } from "@/lib/settings";

/**
 * Партнёрская программа глазами партнёра: его заявка, его деньги.
 *
 * Данных покупателя здесь нет и быть не должно — партнёр видит дату,
 * номер заказа, его сумму и своё вознаграждение, и ничего больше.
 */

const PROGRAM = {
  ratePercent: PARTNER_RATE_PERCENT,
  attributionDays: ATTRIBUTION_DAYS,
  rulesVersion: RULES_VERSION,
};

/** Режим приёма и вопрос заявки владелец переключает в админке. */
async function program(siteUrl: string) {
  const settings = await getPartnerSettings();
  return { ...PROGRAM, siteUrl, ...settings };
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* Ссылку партнёр копирует и уносит наружу, поэтому адрес сайта берём
     от сервера: боевой домен из переменной окружения, а в разработке —
     тот, по которому пришёл запрос. */
  const siteUrl = process.env.SITE_URL ?? new URL(request.url).origin;

  const partner = await findByUserId(user.id);
  if (!partner) {
    return NextResponse.json({
      partner: null,
      program: await program(siteUrl),
    });
  }

  const base = {
    status: partner.status,
    refCode: partner.refCode,
    note: partner.note,
    createdAt: partner.createdAt,
    decidedAt: partner.decidedAt,
    /* Ни налогового статуса, ни ИНН: их нигде не показывают, и отдавать их
       наружу незачем — даже собственному кабинету партнёра. */
    payout: partner.payoutMethod
      ? {
          method: partner.payoutMethod,
          target: partner.payoutTarget,
          name: partner.payoutName,
        }
      : null,
  };

  /* Начисления показываем всем, у кого есть код, — в том числе отключённому
     партнёру: участие остановлено, но заработанное остаётся его, и он должен
     видеть, что ему причитается. */
  if (!partner.refCode) {
    return NextResponse.json({
      partner: base,
      program: await program(siteUrl),
    });
  }

  const [stats, accruals, payouts] = await Promise.all([
    statsFor(partner.refCode),
    listAccruals(partner.refCode),
    listPayouts(partner.refCode),
  ]);

  const now = Date.now();
  return NextResponse.json({
    partner: base,
    program: await program(siteUrl),
    stats,
    orders: accruals.map((a) => ({
      invId: a.invId,
      amountKop: a.amountKop,
      baseRub: a.baseRub,
      status: a.status,
      reason: a.reason,
      ripeAt: a.ripeAt,
      /* Созрело ли начисление, решает сервер: в интерфейсе не должно быть
         арифметики по текущему времени. */
      ripe: new Date(a.ripeAt).getTime() <= now,
      paidOut: a.payoutId !== null,
      orderTotalRub: a.orderTotalRub,
      orderCreatedAt: a.orderCreatedAt,
    })),
    payouts,
  });
}

/** Подать заявку. Имя и почта берутся из учётки — форма не нужна. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { acceptRules?: unknown; motivation?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  /* Правила принимаются осознанно: без отметки заявки нет. Версия правил
     сохраняется в заявке — потом видно, с чем именно человек согласился. */
  if (body.acceptRules !== true) {
    return NextResponse.json({ error: "rules_required" }, { status: 400 });
  }

  const siteUrl = process.env.SITE_URL ?? new URL(request.url).origin;
  const settings = await getPartnerSettings();

  const existing = await findByUserId(user.id);
  if (existing) {
    return NextResponse.json({
      partner: {
        status: existing.status,
        refCode: existing.refCode,
        note: existing.note,
        createdAt: existing.createdAt,
        decidedAt: existing.decidedAt,
        payout: null,
      },
      program: await program(siteUrl),
    });
  }

  try {
    /* В автоматическом режиме код выдаётся тут же: рассматривать нечего,
       и человек уходит со ссылкой, а не с ожиданием. */
    const created = await createApplication({
      userId: user.id,
      name: user.name,
      email: user.email,
      rulesVersion: RULES_VERSION,
      motivation:
        settings.askMotivation && typeof body.motivation === "string"
          ? body.motivation
          : null,
      auto: settings.mode === "auto",
    });
    return NextResponse.json({
      partner: {
        status: created.status,
        refCode: created.refCode,
        note: created.note,
        createdAt: created.createdAt,
        decidedAt: created.decidedAt,
        payout: null,
      },
      program: await program(siteUrl),
    });
  } catch (e) {
    console.error("заявка партнёра не создалась", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

const DIGITS = (v: string) => v.replace(/\D/g, "");

/** Реквизиты выплаты. Номера карт не принимаем принципиально: СБП или счёт. */
export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const partner = await findByUserId(user.id);
  if (!partner || partner.status !== "approved") {
    return NextResponse.json({ error: "not_partner" }, { status: 403 });
  }

  let body: {
    method?: unknown;
    target?: unknown;
    name?: unknown;
    taxId?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const method = body.method === "account" ? "account" : "sbp";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const target = DIGITS(typeof body.target === "string" ? body.target : "");

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "bad_name" }, { status: 400 });
  }
  if (method === "sbp" && (target.length < 10 || target.length > 11)) {
    return NextResponse.json({ error: "bad_phone" }, { status: 400 });
  }
  if (method === "account" && target.length !== 20) {
    return NextResponse.json({ error: "bad_account" }, { status: 400 });
  }

  try {
    const updated = await updatePayoutDetails(partner.id, {
      method: method as PayoutMethod,
      target,
      name,
    });
    return NextResponse.json({
      payout: updated && {
        method: updated.payoutMethod,
        target: updated.payoutTarget,
        name: updated.payoutName,
      },
    });
  } catch (e) {
    /* Тот же ИНН уже привязан к другой учётной записи */
    if ((e as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "tax_id_taken" }, { status: 409 });
    }
    console.error("реквизиты выплаты не сохранились", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
