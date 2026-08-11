"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Partner application: name + email in, "application sent" out.
 * The application lands in the admin cabinet for review; the personal link
 * is issued there on approval.
 */
export default function LinkGenerator() {
  const { t } = useLang();
  const reduce = useReducedMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) next.name = t("form.required");
    if (!email.trim()) next.email = t("form.required");
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t("form.email");
    setErrors(next);
    if (next.name || next.email) return;

    setSending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (!res.ok) throw new Error("rejected");
      setSent(true);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  const swap = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3 },
      }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.5, ease: EASE },
      };

  return (
    <div className="border hairline bg-porcelain px-6 py-10 md:px-14 md:py-14">
      <AnimatePresence mode="wait" initial={false}>
        {!sent ? (
          <motion.form key="form" {...swap} onSubmit={handleSubmit} noValidate>
            <h2 className="label label-muted">{t("partners.form.title")}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-5">
              <div>
                <input
                  className={`field ${errors.name ? "field-invalid" : ""}`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((p) => (p.name ? { ...p, name: undefined } : p));
                  }}
                  placeholder={t("partners.form.name")}
                  aria-label={t("partners.form.name")}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? "err-pt-name" : undefined}
                  autoComplete="name"
                  required
                />
                {errors.name && (
                  <p id="err-pt-name" className="field-error">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <input
                  className={`field ${errors.email ? "field-invalid" : ""}`}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) =>
                      p.email ? { ...p, email: undefined } : p,
                    );
                  }}
                  placeholder={t("partners.form.email")}
                  aria-label={t("partners.form.email")}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "err-pt-email" : undefined}
                  autoComplete="email"
                  required
                />
                {errors.email && (
                  <p id="err-pt-email" className="field-error">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary mt-8 w-full md:w-auto"
              disabled={sending}
            >
              {sending ? t("partners.form.sending") : t("partners.form.cta")}
            </button>
            {failed && (
              <p className="field-error mt-4" role="alert">
                {t("partners.form.failed")}
              </p>
            )}
          </motion.form>
        ) : (
          <motion.div key="sent" {...swap} aria-live="polite">
            <h2 className="label label-muted">{t("partners.form.done")}</h2>
            <p className="accent-serif mt-6 max-w-xl text-xl leading-snug md:text-2xl">
              {t("partners.form.sent")}{" "}
              <span className="whitespace-nowrap">{email.trim()}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
