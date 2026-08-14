"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang, type DictKey } from "@/lib/i18n";

type Payout = {
  method: "sbp" | "account";
  target: string | null;
  name: string | null;
};

const KNOWN_ERRORS = ["bad_name", "bad_phone", "bad_account"] as const;

/**
 * Реквизиты для выплаты вознаграждения. Номера карт не принимаем: СБП по
 * телефону или расчётный счёт — этого хватает, а хранить нужно меньше.
 */
export default function PayoutDetailsForm({
  initial,
}: {
  initial: Payout | null;
}) {
  const { t } = useLang();
  const [method, setMethod] = useState<"sbp" | "account">(
    initial?.method ?? "sbp",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const value = (n: string) =>
      (form.elements.namedItem(n) as HTMLInputElement | null)?.value.trim() ??
      "";

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/account/partner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          target: value("target"),
          name: value("name"),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        const code = data?.error ?? "";
        setError(
          (KNOWN_ERRORS as readonly string[]).includes(code) ? code : "bad_name",
        );
        return;
      }
      setSaved(true);
    } catch {
      setError("bad_name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-xl">
      <fieldset>
        <legend className="label label-muted">
          {t("account.partner.payout.method")}
        </legend>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          {(["sbp", "account"] as const).map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="method"
                value={id}
                checked={method === id}
                onChange={() => setMethod(id)}
                className="h-4 w-4 accent-[var(--ink)]"
              />
              {t(`account.partner.payout.${id}` as DictKey)}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Одна сетка на все поля: подписи в один ряд, поля — в другой, так
          что разная длина подписи не сдвигает соседнее поле вниз */}
      <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <label className="flex flex-col justify-end">
          <span className="label label-muted">
            {t(
              method === "sbp"
                ? "account.partner.payout.phone"
                : "account.partner.payout.number",
            )}
          </span>
          <input
            className="field mt-2"
            name="target"
            defaultValue={initial?.target ?? ""}
            inputMode="numeric"
            autoComplete={method === "sbp" ? "tel" : "off"}
          />
        </label>
        <label className="flex flex-col justify-end">
          <span className="label label-muted">
            {t("account.partner.payout.name")}
          </span>
          <input
            className="field mt-2"
            name="name"
            defaultValue={initial?.name ?? ""}
            autoComplete="name"
          />
        </label>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-5">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-onlight-outline disabled:cursor-wait disabled:opacity-60"
        >
          {t("account.partner.payout.save")}
        </button>
        <AnimatePresence>
          {saved && (
            <motion.span
              key="saved"
              role="status"
              className="label label-muted"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {t("account.partner.payout.saved")}
            </motion.span>
          )}
          {error && (
            <motion.span
              key="error"
              role="alert"
              className="field-error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {t(`account.partner.payout.error.${error}` as DictKey)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
