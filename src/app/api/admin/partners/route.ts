import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/admin-auth";
import {
  adminCancelAccrual,
  adminSummary,
  approveAccrual,
  cancelPayout,
  createPayout,
  listAccruals,
  listPayouts,
} from "@/lib/partner-ledger";
import {
  adminList,
  adminUpdate,
  findByRefCode,
  linkToUser,
  type PartnerStatus,
} from "@/lib/partners";
import {
  getPartnerSettings,
  setPartnerSettings,
  type PartnerMode,
} from "@/lib/settings";
import { findForLogin } from "@/lib/users";

const STATUSES: PartnerStatus[] = ["new", "approved", "rejected"];

/** Список участников с настоящими числами по каждому. */
export async function GET(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  const code = new URL(request.url).searchParams.get("code");
  /* Карточка одного партнёра: начисления и выплаты по коду */
  if (code) {
    const partner = await findByRefCode(code);
    if (!partner) {
      return NextResponse.json({ error: "Партнёр не найден" }, { status: 404 });
    }
    const [accruals, payouts] = await Promise.all([
      listAccruals(code),
      listPayouts(code),
    ]);
    /* Созрело ли начисление, решает сервер: в интерфейсе не должно быть
       арифметики по текущему времени. */
    const now = Date.now();
    return NextResponse.json({
      partner,
      accruals: accruals.map((a) => ({
        ...a,
        ripe: new Date(a.ripeAt).getTime() <= now,
      })),
      payouts,
    });
  }

  const [applications, summary, settings] = await Promise.all([
    adminList(),
    adminSummary(),
    getPartnerSettings(),
  ]);
  return NextResponse.json({
    settings,
    applications: applications.map((p) => ({
      ...p,
      stats: (p.refCode && summary[p.refCode]) || {
        orders: 0,
        accruedKop: 0,
        payableKop: 0,
        paidKop: 0,
        clicks: 0,
      },
    })),
  });
}

export async function PATCH(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  let body: { id?: unknown; status?: unknown; note?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const patch: { status?: PartnerStatus; note?: string | null } = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as PartnerStatus)) {
      return NextResponse.json({ error: "Неизвестный статус" }, { status: 400 });
    }
    patch.status = body.status as PartnerStatus;
  }
  if (body.note !== undefined) {
    patch.note =
      body.note === null ? null : String(body.note).trim().slice(0, 500) || null;
  }
  /* Отказ без причины — тупик для человека: он не знает, что исправить */
  if (patch.status === "rejected" && !patch.note) {
    return NextResponse.json(
      { error: "Укажите причину отказа — партнёр её увидит" },
      { status: 400 },
    );
  }

  const application = await adminUpdate(id, patch);
  if (!application) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  return NextResponse.json({ application });
}

/** Деньги: собрать выплату, отменить выплату, снять начисление. */
export async function POST(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;

  let body: {
    action?: unknown;
    refCode?: unknown;
    payoutId?: unknown;
    invId?: unknown;
    note?: unknown;
    id?: unknown;
    email?: unknown;
    invIds?: unknown;
    mode?: unknown;
    askMotivation?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  /* Удаления участника нет намеренно: заявку отклоняют, партнёра отключают —
     ссылка перестаёт работать, а история начислений и выплат остаётся. */

  /* Режим приёма: «по заявке» или «сразу по кнопке» — и нужен ли вопрос
     «почему мы должны выбрать вас». Переключается без пересборки. */
  if (body.action === "settings") {
    const patch: { mode?: PartnerMode; askMotivation?: boolean } = {};
    if (body.mode === "auto" || body.mode === "review") patch.mode = body.mode;
    if (typeof body.askMotivation === "boolean") {
      patch.askMotivation = body.askMotivation;
    }
    return NextResponse.json({ settings: await setPartnerSettings(patch) });
  }

  if (body.action === "link_user") {
    const id = Number(body.id);
    const email = String(body.email ?? "");
    if (!Number.isInteger(id) || !email) {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }
    const found = await findForLogin(email);
    if (!found) {
      return NextResponse.json(
        { error: "Учётной записи с такой почтой нет" },
        { status: 404 },
      );
    }
    const linked = await linkToUser(id, found.user.id);
    if (!linked) {
      return NextResponse.json(
        { error: "Заявка уже привязана к учётной записи" },
        { status: 409 },
      );
    }
    return NextResponse.json({ application: linked });
  }

  if (body.action === "payout") {
    const refCode = String(body.refCode ?? "");
    const partner = await findByRefCode(refCode);
    if (!partner) {
      return NextResponse.json({ error: "Партнёр не найден" }, { status: 404 });
    }
    /* Без реквизитов выплата не собирается: иначе начисления помечаются
       выплаченными, а переводить их некуда. */
    if (!partner.payoutMethod || !partner.payoutTarget) {
      return NextResponse.json(
        { error: "Партнёр ещё не заполнил реквизиты выплаты" },
        { status: 409 },
      );
    }
    /* Список номеров — выплата части: админ отмечает в списке начислений,
       какие переводит сейчас. */
    const invIds = Array.isArray(body.invIds)
      ? body.invIds.map(Number).filter(Number.isInteger)
      : undefined;

    const result = await createPayout({
      refCode,
      method: partner.payoutMethod,
      target: partner.payoutTarget,
      note: body.note === undefined ? null : String(body.note).slice(0, 300),
      invIds,
    });
    if (!result) {
      return NextResponse.json(
        { error: "Нечего выплачивать: подтверждённых начислений нет" },
        { status: 409 },
      );
    }
    return NextResponse.json(result);
  }

  if (body.action === "cancel_payout") {
    const payoutId = Number(body.payoutId);
    if (!Number.isInteger(payoutId)) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }
    const ok = await cancelPayout(payoutId);
    if (!ok) {
      return NextResponse.json(
        { error: "Выплата не найдена или уже отменена" },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "cancel_accrual" || body.action === "approve_accrual") {
    const invId = Number(body.invId);
    if (!Number.isInteger(invId)) {
      return NextResponse.json({ error: "Некорректный номер" }, { status: 400 });
    }
    if (body.action === "approve_accrual") await approveAccrual(invId);
    else await adminCancelAccrual(invId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
