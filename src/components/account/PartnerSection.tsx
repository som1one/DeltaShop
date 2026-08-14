"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatKop, useLang } from "@/lib/i18n";
import { useProducts } from "@/lib/products-context";
import PayoutDetailsForm from "@/components/account/PayoutDetailsForm";

const EASE = [0.22, 1, 0.36, 1] as const;

type PartnerState = {
  status: "new" | "approved" | "rejected";
  refCode: string | null;
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
  payout: {
    method: "sbp" | "account";
    target: string | null;
    name: string | null;
  } | null;
};

type Stats = {
  clicks30: number;
  clicksTotal: number;
  orders: number;
  accruedKop: number;
  holdKop: number;
  payableKop: number;
  paidKop: number;
  cancelledKop: number;
};

type PartnerOrder = {
  invId: number;
  amountKop: number;
  status: "pending" | "review" | "paid" | "cancelled";
  reason:
    | "self"
    | "order_cancelled"
    | "unverified"
    | "admin"
    | "restored"
    | null;
  ripeAt: string;
  /** Созрело ли начисление — считает сервер, не интерфейс */
  ripe: boolean;
  orderTotalRub: number;
  orderCreatedAt: string;
};

type Payout = {
  id: number;
  amountKop: number;
  createdAt: string;
  cancelledAt: string | null;
  note: string | null;
  receiptPath: string | null;
};

type Payload = {
  partner: PartnerState | null;
  program: {
    ratePercent: number;
    attributionDays: number;
    siteUrl: string;
    /** review — заявку смотрит человек, auto — ссылка выдаётся сразу */
    mode: "review" | "auto";
    askMotivation: boolean;
  };
  stats?: Stats;
  orders?: PartnerOrder[];
  payouts?: Payout[];
};

/** Заголовок раздела внутри кабинета партнёра. */
function Block({
  title,
  children,
  note,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t hairline pt-8 md:pt-10">
      <h3 className="label label-muted">{title}</h3>
      {note && (
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted">
          {note}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * Партнёрская программа глазами партнёра.
 *
 * Раздел обязан отвечать на четыре вопроса без посторонней помощи:
 * что за ссылка, что за код, откуда берутся деньги и когда их отдадут.
 */
export default function PartnerSection() {
  const { lang, t } = useLang();
  const { all } = useProducts();
  const reduce = useReducedMotion();

  const [data, setData] = useState<Payload | null>(null);
  const [sending, setSending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [rulesError, setRulesError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [target, setTarget] = useState("/");

  useEffect(() => {
    let alive = true;
    fetch("/api/account/partner", { cache: "no-store" })
      .then(async (res) => {
        if (!alive || !res.ok) return;
        setData((await res.json()) as Payload);
      })
      .catch(() => {
        /* не загрузилось — покажем форму подачи */
      });
    return () => {
      alive = false;
    };
  }, []);

  const apply = async () => {
    if (!accepted) {
      setRulesError(true);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/account/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptRules: true, motivation }),
      });
      if (res.ok) setData((await res.json()) as Payload);
    } catch {
      /* сеть моргнула — кнопка остаётся на месте */
    } finally {
      setSending(false);
    }
  };

  const partner = data?.partner ?? null;
  const code = partner?.refCode ?? null;
  const link = code
    ? `${data?.program.siteUrl ?? ""}/r/${code}${
        target === "/" ? "" : `?to=${target}`
      }`
    : null;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* буфер недоступен — ссылку видно, скопируют руками */
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "long",
    });

  /* Человеческий статус строки: партнёр должен понимать, почему сумма
     здесь, а не на карте, — и почему её нет вовсе. */
  const stateOf = (order: PartnerOrder) => {
    if (order.status === "paid") return t("account.partner.state.paid");
    if (order.status === "review") return t("account.partner.state.review");
    if (order.status === "cancelled") {
      if (order.reason === "self") return t("account.partner.state.self");
      if (order.reason === "admin") return t("account.partner.state.admin");
      return t("account.partner.state.cancelled");
    }
    return order.ripe
      ? t("account.partner.state.payable")
      : `${t("account.partner.state.hold")} ${fmtDate(order.ripeAt)}`;
  };

  if (!data) return <div className="min-h-[20vh]" aria-busy="true" />;

  /* ——— ещё не партнёр: объясняем программу и берём заявку ——— */
  if (!partner) {
    return (
      <div className="max-w-2xl">
        <p className="accent-serif text-xl leading-snug md:text-2xl">
          {t("account.partner.lead")}
        </p>

        <ol className="mt-10 border-t hairline">
          {[
            t("account.partner.how1"),
            t("account.partner.how2"),
            t("account.partner.how3"),
          ].map((text, i) => (
            <li
              key={text}
              className="grid grid-cols-[36px_1fr] gap-x-5 border-b hairline py-5"
            >
              <span className="label label-muted tabular-nums">
                0{i + 1}
              </span>
              <p className="text-[15px] leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>

        {/* Вопрос заявки владелец включает в админке; он необязателен */}
        {data.program.askMotivation && (
          <label className="mt-10 block">
            <span className="label label-muted">
              {t("account.partner.motivation")}
            </span>
            <textarea
              className="field mt-3 min-h-[110px] resize-y"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              maxLength={1000}
              placeholder={t("account.partner.motivation.hint")}
            />
          </label>
        )}

        <p className="mt-8 text-[13px] leading-relaxed text-muted">
          {t("account.partner.tax")}
        </p>

        <label className="mt-8 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => {
              setAccepted(e.target.checked);
              setRulesError(false);
            }}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--ink)]"
          />
          <span>
            {t("account.partner.rules.accept")}
            <span aria-hidden="true"> · </span>
            <Link href="/partner-terms" className="link-quiet">
              {t("account.partner.rules.link")}
            </Link>
          </span>
        </label>
        {rulesError && (
          <p className="field-error mt-3" role="alert">
            {t("account.partner.rules.required")}
          </p>
        )}

        {/* В автоматическом режиме ждать нечего — и кнопка обещает другое */}
        <button
          type="button"
          onClick={apply}
          disabled={sending}
          className="btn btn-primary mt-8 disabled:cursor-wait disabled:opacity-60"
        >
          {sending
            ? t("auth.sending")
            : data.program.mode === "auto"
              ? t("account.partner.join")
              : t("account.partner.apply")}
        </button>
      </div>
    );
  }

  /* ——— заявка подана, решения ещё нет или отказ по заявке ——— */
  if (!code) {
    return (
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="max-w-xl border hairline bg-porcelain px-6 py-6 md:px-8"
      >
        <p className="display text-lg tracking-[0.08em]">
          {t(
            partner.status === "rejected"
              ? "account.partner.status.rejected"
              : "account.partner.status.new",
          )}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          {t(
            partner.status === "rejected"
              ? "account.partner.status.rejected.note"
              : "account.partner.status.new.note",
          )}
        </p>
        {/* Причина отказа — обязательна: иначе человек не знает, что исправить */}
        {partner.status === "rejected" && partner.note && (
          <p className="mt-4 border-t hairline pt-4 text-[15px]">
            {partner.note}
          </p>
        )}
      </motion.div>
    );
  }

  const stats = data.stats;
  const orders = data.orders ?? [];
  const payouts = data.payouts ?? [];

  const summary: { label: string; value: string }[] = stats
    ? [
        { label: t("account.partner.stats.clicks"), value: String(stats.clicks30) },
        { label: t("account.partner.stats.orders"), value: String(stats.orders) },
        {
          label: t("account.partner.stats.hold"),
          value: formatKop(lang, stats.holdKop),
        },
        {
          label: t("account.partner.stats.payable"),
          value: formatKop(lang, stats.payableKop),
        },
        {
          label: t("account.partner.stats.paid"),
          value: formatKop(lang, stats.paidKop),
        },
      ]
    : [];

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col gap-10 md:gap-12"
    >
      {/* Участие остановлено: ссылка больше не работает, но заработанное
          остаётся — поэтому ниже по-прежнему видны деньги и заказы */}
      {partner.status !== "approved" && (
        <div className="border hairline bg-porcelain px-6 py-5 md:px-8">
          <p className="display text-lg tracking-[0.08em]">
            {t("account.partner.status.stopped")}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            {t("account.partner.status.stopped.note")}
          </p>
          {partner.note && (
            <p className="mt-4 border-t hairline pt-4 text-[15px]">
              {partner.note}
            </p>
          )}
        </div>
      )}

      {/* Ссылка — главное, зачем сюда заходят */}
      {partner.status === "approved" && (
      <section>
        <h3 className="label label-muted">{t("account.partner.link")}</h3>
        <p className="mt-4 break-all font-medium text-[17px] md:text-xl">
          {link}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <button type="button" onClick={copy} className="btn btn-primary">
            {copied ? t("account.partner.copied") : t("account.partner.copy")}
          </button>
          <label className="flex items-center gap-3 text-[13px] text-muted">
            {t("account.partner.link.where")}
            <select
              className="field w-auto py-2 text-[13px]"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="/">{t("account.partner.link.home")}</option>
              <option value="/visual">{t("nav.visual")}</option>
              <option value="/forma">{t("nav.forma")}</option>
              {all.map((p) => (
                <option key={p.id} value={`/product/${p.id}`}>
                  {p.name[lang]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-muted">
          {t("account.partner.link.hint")}
        </p>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
          {t("account.partner.code")} {code} — {t("account.partner.code.hint")}
        </p>
      </section>
      )}

      {/* Сводка — только настоящие числа */}
      {stats && (
        <section className="grid grid-cols-2 gap-x-8 gap-y-6 border-t hairline pt-8 md:grid-cols-5">
          {summary.map((item) => (
            <div key={item.label}>
              <p className="display text-2xl tabular-nums md:text-3xl">
                {item.value}
              </p>
              <p className="label label-muted mt-2">{item.label}</p>
            </div>
          ))}
        </section>
      )}

      {/* Заказы по ссылке */}
      <Block title={t("account.partner.orders.title")}>
        {orders.length === 0 ? (
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            {t("account.partner.orders.empty")}
          </p>
        ) : (
          <ul className="border-t hairline">
            {orders.map((order) => (
              <li
                key={order.invId}
                className="grid gap-x-8 gap-y-2 border-b hairline py-5 md:grid-cols-[1fr_auto] md:items-baseline"
              >
                <div className="min-w-0">
                  <p className="text-[15px]">
                    {t("order.title")} №{order.invId}
                    <span aria-hidden="true"> · </span>
                    <span className="text-muted">
                      {fmtDate(order.orderCreatedAt)}
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    {stateOf(order)}
                  </p>
                </div>
                <div className="flex items-baseline gap-6 md:justify-end">
                  {/* Сумма заказа — в рублях и на английском: с неё считается
                      вознаграждение, и пересчёт по выдуманному курсу тут
                      мешал бы сверять цифры */}
                  <span className="text-[13px] tabular-nums text-muted">
                    {formatKop(lang, order.orderTotalRub * 100)}
                  </span>
                  <span
                    className={`display text-lg tabular-nums ${
                      order.status === "cancelled" ? "text-muted line-through" : ""
                    }`}
                  >
                    {formatKop(lang, order.amountKop)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {/* Реквизиты видны сразу: без них выплату не собрать, а узнать об
          этом в момент, когда деньги уже созрели, — плохой сюрприз */}
      <Block
        title={t("account.partner.payout.title")}
        note={t("account.partner.payout.note")}
      >
        <PayoutDetailsForm initial={partner.payout} />
      </Block>

      {/* История выплат */}
      <Block title={t("account.partner.payouts.title")}>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">
            {t("account.partner.payouts.empty")}
          </p>
        ) : (
          <ul className="border-t hairline">
            {payouts.map((payout) => (
              <li
                key={payout.id}
                className="flex flex-wrap items-baseline justify-between gap-4 border-b hairline py-4"
              >
                <span className="text-[15px]">
                  {fmtDate(payout.createdAt)}
                  {payout.cancelledAt && (
                    <span className="text-muted">
                      {" "}
                      · {t("account.partner.payouts.cancelled")}
                    </span>
                  )}
                  {/* Чек получен — значит, повторно присылать не нужно */}
                  {payout.receiptPath && !payout.cancelledAt && (
                    <span className="text-muted">
                      {" "}
                      · {t("account.partner.payouts.receipt")}
                    </span>
                  )}
                </span>
                <span
                  className={`display text-lg tabular-nums ${
                    payout.cancelledAt ? "text-muted line-through" : ""
                  }`}
                >
                  {formatKop(lang, payout.amountKop)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Link href="/partner-terms" className="link-quiet label self-start">
        {t("account.partner.rules.link")}
      </Link>
    </motion.div>
  );
}
