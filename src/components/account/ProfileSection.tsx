"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { useAuth, type AccountUser } from "@/lib/auth-context";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Короткий ответ формы — «Сохранено», ошибка — появляется мягко. */
function Note({ children, alert }: { children: string; alert?: boolean }) {
  return (
    <motion.span
      role={alert ? "alert" : "status"}
      className={alert ? "field-error" : "label label-muted"}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {children}
    </motion.span>
  );
}

/** Профиль: данные доставки и смена пароля. */
export default function ProfileSection() {
  const { t } = useLang();
  const { user, setUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  if (!user) return null;

  const saveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const value = (n: string) =>
      (form.elements.namedItem(n) as HTMLInputElement | null)?.value.trim() ??
      "";

    setSaving(true);
    setSaved(false);
    setFailed(false);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: value("name"),
          phone: value("phone"),
          city: value("city"),
          address: value("address"),
        }),
      });
      if (!res.ok) throw new Error("rejected");
      const data = (await res.json()) as { user: AccountUser };
      setUser(data.user);
      setSaved(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    setPwDone(false);
    setPwError(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setPwError(
          data?.error === "weak_password"
            ? t("auth.error.weak_password")
            : data?.error === "bad_credentials"
              ? t("account.password.wrong")
              : t("auth.error.server"),
        );
        return;
      }
      setCurrent("");
      setNext("");
      setPwDone(true);
    } catch {
      setPwError(t("auth.error.server"));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
      <form onSubmit={saveProfile} className="min-w-0">
        <h2 className="label">{t("account.profile.title")}</h2>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {t("account.profile.note")}
        </p>

        {/* Почта не показывается: менять её нельзя, а увидеть — можно
            строкой выше, под заголовком кабинета */}
        <div className="mt-8 flex flex-col gap-4">
          <label className="block">
            <span className="label label-muted">{t("checkout.name")}</span>
            <input
              className="field mt-2"
              name="name"
              defaultValue={user.name}
              autoComplete="name"
              required
            />
          </label>
          <label className="block">
            <span className="label label-muted">{t("checkout.phone")}</span>
            <input
              className="field mt-2"
              name="phone"
              type="tel"
              defaultValue={user.phone}
              autoComplete="tel"
            />
          </label>
          <label className="block">
            <span className="label label-muted">{t("checkout.city")}</span>
            <input
              className="field mt-2"
              name="city"
              defaultValue={user.city}
              autoComplete="address-level2"
            />
          </label>
          <label className="block">
            <span className="label label-muted">{t("checkout.address")}</span>
            <input
              className="field mt-2"
              name="address"
              defaultValue={user.address}
              autoComplete="street-address"
            />
          </label>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-5">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary disabled:cursor-wait disabled:opacity-60"
          >
            {t("account.profile.save")}
          </button>
          <AnimatePresence>
            {saved && <Note key="saved">{t("account.profile.saved")}</Note>}
            {failed && (
              <Note key="failed" alert>
                {t("account.profile.failed")}
              </Note>
            )}
          </AnimatePresence>
        </div>
      </form>

      <form onSubmit={savePassword} className="min-w-0">
        <h2 className="label">{t("account.password.title")}</h2>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {t("auth.password.hint")}
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <label className="block">
            <span className="label label-muted">
              {t("account.password.current")}
            </span>
            <input
              className="field mt-2"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="block">
            <span className="label label-muted">
              {t("account.password.next")}
            </span>
            <input
              className="field mt-2"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-5">
          <button
            type="submit"
            disabled={pwSaving}
            className="btn btn-onlight-outline disabled:cursor-wait disabled:opacity-60"
          >
            {t("account.password.save")}
          </button>
          <AnimatePresence>
            {pwDone && <Note key="done">{t("account.password.saved")}</Note>}
            {pwError && (
              <Note key="error" alert>
                {pwError}
              </Note>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
