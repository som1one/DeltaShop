"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLang } from "@/lib/i18n";
import Reveal from "@/components/Reveal";

/**
 * Отслеживание заказа: главный сценарий — вставить код отслеживания
 * и перейти; запасной — по номеру заказа и почте. Обе формы сидят
 * в одной карточке на общей двухколоночной сетке, чтобы все края
 * совпадали.
 */
export default function OrderLookupPage() {
  const { t } = useLang();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);

  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async (
    payload: object,
    setErr: (v: string | null) => void,
    setB: (v: boolean) => void,
  ) => {
    setErr(null);
    setB(true);
    try {
      const res = await fetch("/api/order/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as { token: string };
        router.push(`/order/${data.token}`);
        return;
      }
      setErr(t("order.lookup.error"));
    } catch {
      setErr(t("order.lookup.error"));
    }
    setB(false);
  };

  const onCodeSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim()) {
      setCodeError(t("form.required"));
      return;
    }
    void go({ code }, setCodeError, setCodeBusy);
  };

  const onLookupSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!number.trim() || !email.trim()) {
      setError(t("form.required"));
      return;
    }
    void go(
      { invId: number.replace(/\D/g, ""), email: email.trim() },
      setError,
      setBusy,
    );
  };

  return (
    <section className="measure gutter pb-24 pt-28 md:pb-36 md:pt-40">
      <Reveal>
        <p className="label label-muted">{t("footer.info")}</p>
        <h1 className="display mt-6 text-4xl md:text-6xl">
          {t("order.lookup.title")}
        </h1>
        <p className="mt-6 max-w-md text-[15px] text-muted">
          {t("order.code.lead")}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-12 max-w-xl border hairline bg-porcelain p-6 md:p-10">
          {/* Главный сценарий: код отслеживания */}
          <form onSubmit={onCodeSubmit} noValidate>
            <label className="label label-muted" htmlFor="track-code">
              {t("order.code.label")}
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                id="track-code"
                className={`field font-mono uppercase tracking-[0.18em] ${codeError ? "field-invalid" : ""}`}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError(null);
                }}
                placeholder="A1B2C3D4"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={codeBusy}
                aria-busy={codeBusy}
                className="btn btn-primary w-full disabled:cursor-wait disabled:opacity-60"
              >
                {t("order.track.cta")}
              </button>
            </div>
            {codeError && <p className="field-error">{codeError}</p>}
          </form>

          {/* Запасной сценарий: номер + почта */}
          <form
            onSubmit={onLookupSubmit}
            noValidate
            className="mt-10 border-t hairline pt-8"
          >
            <p className="label label-muted">{t("order.lookup.or")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className={`field ${error ? "field-invalid" : ""}`}
                inputMode="numeric"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value);
                  setError(null);
                }}
                placeholder={t("order.lookup.number")}
                aria-label={t("order.lookup.number")}
              />
              <input
                className={`field ${error ? "field-invalid" : ""}`}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder={t("checkout.email")}
                aria-label={t("checkout.email")}
                autoComplete="email"
              />
            </div>
            {error && <p className="field-error">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="btn btn-onlight-outline mt-3 w-full disabled:cursor-wait disabled:opacity-60"
            >
              {t("order.lookup.cta")}
            </button>
          </form>
        </div>
      </Reveal>
    </section>
  );
}
