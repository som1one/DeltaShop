"use client";

import { useEffect, useState } from "react";
import { adminFetch, AdminError } from "@/lib/admin-client";
import { formatKop, plural } from "@/lib/i18n";

type PartnerStatus = "new" | "approved" | "rejected";

type Stats = {
  orders: number;
  accruedKop: number;
  payableKop: number;
  paidKop: number;
  clicks: number;
};

type Application = {
  id: number;
  userId: number | null;
  name: string;
  email: string;
  status: PartnerStatus;
  refCode: string | null;
  note: string | null;
  motivation: string | null;
  payoutMethod: "sbp" | "account" | null;
  payoutTarget: string | null;
  payoutName: string | null;
  taxStatus: "self_employed" | "ip" | null;
  taxId: string | null;
  payoutUpdatedAt: string | null;
  createdAt: string;
  stats: Stats;
};

type Accrual = {
  invId: number;
  amountKop: number;
  status: "pending" | "review" | "paid" | "cancelled";
  reason: string | null;
  ripeAt: string;
  /** Созрело ли — считает сервер */
  ripe: boolean;
  orderTotalRub: number;
  orderCreatedAt: string;
};

type Payout = {
  id: number;
  amountKop: number;
  note: string | null;
  receiptPath: string | null;
  createdAt: string;
  cancelledAt: string | null;
};

const STATUS_LABEL: Record<PartnerStatus, string> = {
  new: "На рассмотрении",
  approved: "Одобрена",
  rejected: "Отклонена",
};

const ACCRUAL_LABEL: Record<string, string> = {
  pending: "Ждёт срока возврата",
  review: "Ручная проверка",
  paid: "Выплачено",
  cancelled: "Отменено",
};

const REASON_LABEL: Record<string, string> = {
  self: "свой заказ",
  order_cancelled: "заказ отменён",
  unverified: "оплата не подтверждена",
  admin: "снято вручную",
  restored: "заказ вернули из отмены",
};

const money = (kop: number) => formatKop("ru", kop);
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });


/**
 * Партнёры: заявки, настоящие числа по каждому и деньги.
 * Выплата собирается одной кнопкой из подтверждённых начислений.
 */
type Settings = { mode: "review" | "auto"; askMotivation: boolean };

export default function PartnersSection({ adminKey }: { adminKey: string }) {
  const [items, setItems] = useState<Application[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  /* Отмеченные к выплате начисления — способ перевести часть, а не всё */
  const [picked, setPicked] = useState<number[]>([]);
  const [detail, setDetail] = useState<{
    accruals: Accrual[];
    payouts: Payout[];
  } | null>(null);

  const load = async () => {
    try {
      const data = await adminFetch<{
        applications: Application[];
        settings: Settings;
      }>(adminKey, "/api/admin/partners");
      setItems(data.applications);
      setSettings(data.settings);
      setError(null);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось загрузить");
    }
  };

  useEffect(() => {
    let alive = true;
    adminFetch<{ applications: Application[]; settings: Settings }>(
      adminKey,
      "/api/admin/partners",
    )
      .then((data) => {
        if (!alive) return;
        setItems(data.applications);
        setSettings(data.settings);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof AdminError ? e.message : "Не удалось загрузить");
      });
    return () => {
      alive = false;
    };
  }, [adminKey]);

  /* Режим приёма меняется на месте: настройка лежит в базе, а не в сборке */
  const saveSettings = async (patch: Partial<Settings>) => {
    setError(null);
    try {
      const data = await adminFetch<{ settings: Settings }>(
        adminKey,
        "/api/admin/partners",
        { method: "POST", body: JSON.stringify({ action: "settings", ...patch }) },
      );
      setSettings(data.settings);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось сохранить");
    }
  };

  const update = async (
    id: number,
    patch: { status?: PartnerStatus; note?: string | null },
  ) => {
    setBusyId(id);
    setError(null);
    try {
      await adminFetch(adminKey, "/api/admin/partners", {
        method: "PATCH",
        body: JSON.stringify({ id, ...patch }),
      });
      setRejecting(null);
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось сохранить");
    } finally {
      setBusyId(null);
    }
  };

  const togglePick = (invId: number) =>
    setPicked((prev) =>
      prev.includes(invId)
        ? prev.filter((id) => id !== invId)
        : [...prev, invId],
    );

  /* Чек присылает партнёр после перевода — админ подшивает файл к выплате */
  const uploadReceipt = async (payoutId: number, file: File, appId: number) => {
    setBusyId(appId);
    setError(null);
    try {
      const form = new FormData();
      form.set("payoutId", String(payoutId));
      form.set("file", file);
      await adminFetch(adminKey, "/api/admin/partners/receipt", {
        method: "POST",
        body: form,
      });
      if (openCode) await loadDetail(openCode);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось приложить чек");
    } finally {
      setBusyId(null);
    }
  };

  const loadDetail = async (code: string) => {
    const data = await adminFetch<{ accruals: Accrual[]; payouts: Payout[] }>(
      adminKey,
      `/api/admin/partners?code=${encodeURIComponent(code)}`,
    );
    setDetail({ accruals: data.accruals, payouts: data.payouts });
  };

  const openDetail = async (code: string) => {
    setPicked([]);
    if (openCode === code) {
      setOpenCode(null);
      setDetail(null);
      return;
    }
    setOpenCode(code);
    setDetail(null);
    try {
      await loadDetail(code);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось загрузить");
    }
  };

  const money_action = async (body: Record<string, unknown>, id: number) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await adminFetch<{ amountKop?: number; count?: number }>(
        adminKey,
        "/api/admin/partners",
        { method: "POST", body: JSON.stringify(body) },
      );
      /* Сумма к переводу обязана остаться на экране: сразу после нажатия
         «к выплате» обнуляется, и админ уже не помнит, сколько отправлять */
      if (body.action === "payout" && res.amountKop) {
        setDone(
          `Собрана выплата ${money(res.amountKop)} по ${res.count} начислению — переведите её партнёру по реквизитам`,
        );
      }
      setPicked([]);
      await load();
      if (openCode) await loadDetail(openCode);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Не удалось выполнить");
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (app: Application) => {
    if (!app.refCode) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/r/${app.refCode}`,
      );
      setCopied(app.id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Буфер обмена недоступен — скопируйте ссылку вручную");
    }
  };

  const pending = items?.filter((a) => a.status === "new").length ?? 0;

  return (
    <div>
      <p className="label label-muted">
        {items
          ? `${items.length} ${plural("ru", items.length, {
              one: "участник",
              few: "участника",
              many: "участников",
            })} · ${pending} ждут решения`
          : "Загружаем…"}
      </p>

      <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-muted">
        Писем сайт не отправляет: решение партнёр видит в своём кабинете.
        «Выплатить» собирает подтверждённые начисления в одну выплату и
        помечает их выплаченными — деньги переводите сами по реквизитам.
      </p>

      {/* Как люди попадают в программу — решение владельца, а не разработчика */}
      {settings && (
        <div className="mt-6 max-w-2xl border hairline bg-porcelain px-5 py-4">
          <p className="label label-muted">Кого пускаем в программу</p>
          <div className="mt-4 flex flex-col gap-3 text-[13px]">
            {(
              [
                [
                  "review",
                  "По заявке",
                  "Каждого смотрите сами: ссылка выдаётся после «Одобрить».",
                ],
                [
                  "auto",
                  "Сразу по кнопке",
                  "Ссылка выдаётся мгновенно всем, кто нажал в кабинете. Отключить потом можно, но выданный код уже разошёлся.",
                ],
              ] as const
            ).map(([mode, title, note]) => (
              <label key={mode} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="partner-mode"
                  className="mt-1 h-4 w-4 accent-[var(--ink)]"
                  checked={settings.mode === mode}
                  onChange={() => saveSettings({ mode })}
                />
                <span>
                  <span className="text-strong">{title}</span>
                  <span className="block text-muted">{note}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="mt-4 flex items-start gap-3 border-t hairline pt-4 text-[13px]">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--ink)]"
              checked={settings.askMotivation}
              onChange={(e) =>
                saveSettings({ askMotivation: e.target.checked })
              }
            />
            <span>
              <span className="text-strong">
                Спрашивать «почему мы должны выбрать вас»
              </span>
              <span className="block text-muted">
                Необязательное поле в заявке; ответ виден в карточке участника.
              </span>
            </span>
          </label>
        </div>
      )}

      {error && (
        <p className="field-error mt-6" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="mt-6 border hairline bg-porcelain px-4 py-3 text-[13px]" role="status">
          {done}
        </p>
      )}

      {items && items.length === 0 && (
        <p className="mt-10 text-muted">Заявок пока нет.</p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-8 border-t hairline">
          {items.map((app) => (
            <li key={app.id} className="border-b hairline py-6">
              <div className="grid gap-4 lg:grid-cols-[1fr_320px_240px] lg:gap-8">
                <div className="min-w-0">
                  <h3 className="display text-sm tracking-[0.14em]">
                    {app.name}
                  </h3>
                  <p className="mt-1 truncate text-sm text-muted">{app.email}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted">
                    {date(app.createdAt)} · {STATUS_LABEL[app.status]}
                  </p>
                  {app.note && (
                    <p className="mt-2 max-w-md text-xs leading-relaxed text-muted">
                      {app.note}
                    </p>
                  )}
                  {/* Ответ на вопрос заявки — то, ради чего его и задавали */}
                  {app.motivation && (
                    <p className="mt-2 max-w-md border-l hairline pl-3 text-xs leading-relaxed">
                      {app.motivation}
                    </p>
                  )}
                  {/* Всё про выплату одним блоком: куда, кому и когда меняли —
                      чтобы перед переводом не собирать это глазами */}
                  {app.status === "approved" && (
                    <dl className="mt-3 grid max-w-md grid-cols-[104px_1fr] gap-x-4 gap-y-1.5 text-xs">
                      <dt className="text-muted">Куда</dt>
                      <dd className="tabular-nums">
                        {app.payoutMethod
                          ? `${app.payoutMethod === "sbp" ? "СБП" : "Счёт"} ${app.payoutTarget}`
                          : "— партнёр ещё не заполнил"}
                      </dd>
                      {app.payoutName && (
                        <>
                          <dt className="text-muted">Получатель</dt>
                          <dd>{app.payoutName}</dd>
                        </>
                      )}
                      {/* Смена реквизитов перед выплатой — первый признак
                          угнанной учётки, поэтому дата на виду */}
                      {app.payoutUpdatedAt && (
                        <>
                          <dt className="text-muted">Изменены</dt>
                          <dd className="tabular-nums">
                            {date(app.payoutUpdatedAt)}
                          </dd>
                        </>
                      )}
                    </dl>
                  )}

                  {/* Без учётной записи партнёр не видит кабинета: ни ссылки,
                      ни начислений. Связывает человек — по совпадению почты
                      этого делать нельзя, почта при регистрации не
                      подтверждается. */}
                  {!app.userId && (
                    <div className="mt-3 max-w-md border hairline bg-porcelain px-3 py-2 text-xs leading-relaxed">
                      <p className="text-muted">
                        Заявка не связана с учётной записью — партнёр не увидит
                        ни ссылку, ни начисления.
                      </p>
                      <button
                        type="button"
                        className="hairline mt-2 border px-3 py-1.5 disabled:opacity-40"
                        disabled={busyId === app.id}
                        onClick={() =>
                          money_action(
                            {
                              action: "link_user",
                              id: app.id,
                              email: app.email,
                            },
                            app.id,
                          )
                        }
                      >
                        Связать с учётной записью {app.email}
                      </button>
                    </div>
                  )}
                </div>

                <div className="min-w-0 text-xs tabular-nums text-muted">
                  {app.refCode ? (
                    <>
                      <p className="break-all">/r/{app.refCode}</p>
                      <button
                        type="button"
                        className="hairline mt-2 border px-3 py-1.5"
                        onClick={() => copy(app)}
                      >
                        {copied === app.id ? "Скопировано" : "Скопировать"}
                      </button>
                      <p className="mt-3 text-strong">
                        {app.stats.clicks} переходов · {app.stats.orders} заказов
                      </p>
                      <p className="mt-1">
                        начислено {money(app.stats.accruedKop)} · выплачено{" "}
                        {money(app.stats.paidKop)}
                      </p>
                      <p className="mt-1 text-strong">
                        к выплате {money(app.stats.payableKop)}
                      </p>
                    </>
                  ) : (
                    <span>Код появится после одобрения</span>
                  )}
                </div>

                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  {app.status !== "approved" && (
                    <button
                      type="button"
                      className="hairline border px-4 py-2 text-xs disabled:opacity-40"
                      disabled={busyId === app.id}
                      onClick={() => update(app.id, { status: "approved" })}
                    >
                      Одобрить
                    </button>
                  )}
                  {/* У заявки решение, у действующего партнёра — отключение:
                      это разные вещи, и называться должны по-разному */}
                  {app.status !== "rejected" && (
                    <button
                      type="button"
                      className="hairline border px-4 py-2 text-xs text-(--oxblood) disabled:opacity-40"
                      disabled={busyId === app.id}
                      onClick={() => {
                        setRejecting(app.id);
                        setReason(app.note ?? "");
                      }}
                    >
                      {app.status === "approved" ? "Отключить" : "Отклонить"}
                    </button>
                  )}
                  {app.refCode && app.stats.payableKop > 0 && (
                    <button
                      type="button"
                      className="hairline border px-4 py-2 text-xs disabled:opacity-40"
                      disabled={busyId === app.id}
                      onClick={() =>
                        money_action(
                          { action: "payout", refCode: app.refCode },
                          app.id,
                        )
                      }
                    >
                      Выплатить всё · {money(app.stats.payableKop)}
                    </button>
                  )}
                  {app.refCode && (
                    <button
                      type="button"
                      className="label link-quiet px-1 py-2 text-xs"
                      onClick={() => openDetail(app.refCode!)}
                    >
                      {openCode === app.refCode ? "Свернуть" : "Начисления"}
                    </button>
                  )}
                </div>
              </div>

              {/* Причина обязательна: и отказ, и отключение партнёр увидит
                  у себя, а решение без объяснения — тупик для человека */}
              {rejecting === app.id && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    className="field max-w-md"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      app.status === "approved"
                        ? "Причина отключения — партнёр её увидит"
                        : "Причина отказа — партнёр её увидит"
                    }
                    aria-label="Причина решения"
                  />
                  <button
                    type="button"
                    className="hairline border px-4 py-2 text-xs disabled:opacity-40"
                    disabled={busyId === app.id || reason.trim().length < 3}
                    onClick={() =>
                      update(app.id, { status: "rejected", note: reason.trim() })
                    }
                  >
                    {app.status === "approved"
                      ? "Отключить партнёра"
                      : "Сохранить отказ"}
                  </button>
                  <button
                    type="button"
                    className="label link-quiet text-xs text-muted"
                    onClick={() => setRejecting(null)}
                  >
                    Отмена
                  </button>
                </div>
              )}

              {/* Проверка на код обязательна: у нерешённых заявок он null,
                  и без неё панель раскрывалась бы сразу под всеми ними */}
              {app.refCode && openCode === app.refCode && (
                <div className="mt-6 border-t hairline pt-5">
                  {!detail && <p className="text-xs text-muted">Загружаем…</p>}
                  {detail && detail.accruals.length === 0 && (
                    <p className="text-xs text-muted">Начислений пока нет.</p>
                  )}
                  {detail && detail.accruals.length > 0 && (
                    <>
                      <p className="label label-muted">Начисления</p>
                      {/* Одна сетка на все строки: номера и суммы стоят в
                          колонках, а не разъезжаются по ширине текста */}
                      <ul className="mt-3 text-xs">
                        {detail.accruals.map((a) => {
                          const payable = a.status === "pending" && a.ripe;
                          return (
                            <li
                              key={a.invId}
                              className="grid grid-cols-[20px_1fr_auto] items-baseline gap-x-4 gap-y-1 border-b hairline py-2 md:grid-cols-[20px_150px_1fr_110px_120px]"
                            >
                              <span>
                                {payable && (
                                  <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 accent-[var(--ink)]"
                                    checked={picked.includes(a.invId)}
                                    onChange={() => togglePick(a.invId)}
                                    aria-label={`Включить №${a.invId} в выплату`}
                                  />
                                )}
                              </span>
                              <span className="tabular-nums">
                                №{a.invId}
                                <span className="text-muted">
                                  {" "}
                                  · {date(a.orderCreatedAt)}
                                </span>
                              </span>
                              <span className={payable ? "" : "text-muted"}>
                                {/* Созревшее начисление называется тем, чем
                                    оно и является: деньгами к переводу */}
                                {payable
                                  ? "Готово к выплате"
                                  : ACCRUAL_LABEL[a.status]}
                                {a.reason
                                  ? ` (${REASON_LABEL[a.reason] ?? a.reason})`
                                  : ""}
                                {a.status === "pending" &&
                                  !a.ripe &&
                                  ` · до ${date(a.ripeAt)}`}
                              </span>
                              <span className="tabular-nums text-muted md:text-right">
                                {a.orderTotalRub.toLocaleString("ru-RU")} ₽
                              </span>
                              <span className="flex items-baseline justify-end gap-4 tabular-nums">
                                {money(a.amountKop)}
                                {a.status === "review" && (
                                  <button
                                    type="button"
                                    className="label link-quiet"
                                    onClick={() =>
                                      money_action(
                                        {
                                          action: "approve_accrual",
                                          invId: a.invId,
                                        },
                                        app.id,
                                      )
                                    }
                                  >
                                    Принять
                                  </button>
                                )}
                                {(a.status === "pending" ||
                                  a.status === "review") && (
                                  <button
                                    type="button"
                                    className="label link-quiet text-(--oxblood)"
                                    onClick={() =>
                                      money_action(
                                        {
                                          action: "cancel_accrual",
                                          invId: a.invId,
                                        },
                                        app.id,
                                      )
                                    }
                                  >
                                    Снять
                                  </button>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      {/* Выплата части: отметили нужные строки — перевели их */}
                      {picked.length > 0 && (
                        <button
                          type="button"
                          className="hairline mt-3 border px-4 py-2 text-xs disabled:opacity-40"
                          disabled={busyId === app.id}
                          onClick={() =>
                            money_action(
                              {
                                action: "payout",
                                refCode: app.refCode,
                                invIds: picked,
                              },
                              app.id,
                            )
                          }
                        >
                          Выплатить выбранное ·{" "}
                          {money(
                            detail.accruals
                              .filter((a) => picked.includes(a.invId))
                              .reduce((sum, a) => sum + a.amountKop, 0),
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {detail && detail.payouts.length > 0 && (
                    <>
                      <p className="label label-muted mt-7">Выплаты</p>
                      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
                        Строка выплаты — это пачка начислений, помеченных
                        выплаченными. Деньги переводите сами по реквизитам
                        сверху; чек, который пришлёт партнёр, подшивайте сюда же.
                      </p>
                      {/* Жёсткие колонки: сумма и кнопки больше не наезжают
                          друг на друга, отменённые видно по вычеркнутой сумме */}
                      <ul className="mt-3 text-xs">
                        <li className="grid grid-cols-[88px_1fr_100px] items-baseline gap-x-4 border-b hairline pb-2 text-muted md:grid-cols-[88px_120px_1fr_100px_170px]">
                          <span>Выплата</span>
                          <span className="hidden md:block">Состояние</span>
                          <span>Чек</span>
                          <span className="text-right">Сумма</span>
                          <span className="hidden md:block" />
                        </li>
                        {detail.payouts.map((p) => (
                          <li
                            key={p.id}
                            className="grid grid-cols-[88px_1fr_100px] items-baseline gap-x-4 gap-y-2 border-b hairline py-2.5 md:grid-cols-[88px_120px_1fr_100px_170px]"
                          >
                            <span className="tabular-nums">
                              #{p.id}
                              <span className="block text-muted">
                                {date(p.createdAt)}
                              </span>
                            </span>
                            <span
                              className={
                                p.cancelledAt ? "text-(--oxblood)" : "text-muted"
                              }
                            >
                              {p.cancelledAt ? "Отменена" : "Переведена"}
                            </span>
                            {/* Чек самозанятого — единственное подтверждение
                                расхода у ИП, поэтому он в своей колонке */}
                            <span className="min-w-0">
                              {p.receiptPath ? (
                                <a
                                  href={p.receiptPath}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="link-quiet"
                                >
                                  Открыть ↗
                                </a>
                              ) : p.cancelledAt ? (
                                <span className="text-muted">—</span>
                              ) : (
                                <label className="hairline cursor-pointer border px-2 py-1">
                                  Приложить
                                  <input
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadReceipt(p.id, file, app.id);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                            </span>
                            <span
                              className={`text-right tabular-nums ${
                                p.cancelledAt ? "text-muted line-through" : ""
                              }`}
                            >
                              {money(p.amountKop)}
                            </span>
                            <span className="col-span-3 md:col-span-1 md:text-right">
                              {!p.cancelledAt && (
                                <button
                                  type="button"
                                  className="hairline border px-3 py-1 text-(--oxblood) disabled:opacity-40"
                                  disabled={busyId === app.id}
                                  onClick={() =>
                                    money_action(
                                      { action: "cancel_payout", payoutId: p.id },
                                      app.id,
                                    )
                                  }
                                >
                                  Отменить выплату
                                </button>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
