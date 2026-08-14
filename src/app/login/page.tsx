"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLang, type DictKey } from "@/lib/i18n";
import { useAuth, type AccountUser } from "@/lib/auth-context";
import Reveal from "@/components/Reveal";
import { seller } from "@/lib/legal";

const EASE = [0.22, 1, 0.36, 1] as const;

type Mode = "login" | "register";

/** Коды ошибок сервера, для которых есть свой текст. */
const KNOWN_ERRORS = [
  "bad_email",
  "bad_name",
  "weak_password",
  "email_taken",
  "bad_credentials",
  "rate_limited",
] as const;

function AuthForm() {
  const { t } = useLang();
  const { setUser } = useAuth();
  const router = useRouter();
  const reduce = useReducedMotion();
  const params = useSearchParams();
  /* Возврат только внутрь сайта: чужой абсолютный адрес в next превратил бы
     форму входа в открытый редирект. */
  const rawNext = params.get("next") ?? "/account";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/account";

  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "register" ? "register" : "login",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && !name.trim()) {
      setError("bad_name");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "login"
              ? { email: email.trim(), password }
              : { name: name.trim(), email: email.trim(), password },
          ),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        user?: AccountUser;
        error?: string;
      } | null;

      if (!res.ok || !data?.user) {
        const code = data?.error ?? "server";
        setError(
          (KNOWN_ERRORS as readonly string[]).includes(code) ? code : "server",
        );
        return;
      }
      setUser(data.user);
      router.push(next);
      /* Серверные компоненты (шапка, корневой layout) должны увидеть
         новую сессию — без этого «Войти» останется до перезагрузки. */
      router.refresh();
    } catch {
      setError("server");
    } finally {
      setSending(false);
    }
  };

  const register = mode === "register";

  return (
    <section className="measure gutter pb-24 pt-28 md:pb-36 md:pt-40">
      <div className="mx-auto max-w-md">
        <Reveal>
          <p className="label label-muted">{t("auth.title")}</p>
          {/* Заголовок и подводка меняются вместе с режимом — подменяем их
              перекрёстным затуханием, чтобы форма не «прыгала» */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <h1 className="display mt-6 text-4xl md:text-5xl">
                {register ? t("auth.tab.register") : t("auth.tab.login")}
              </h1>
              <p className="mt-6 text-[15px] leading-relaxed text-muted">
                {register ? t("auth.lead.register") : t("auth.lead.login")}
              </p>
            </motion.div>
          </AnimatePresence>
        </Reveal>

        <Reveal delay={0.1}>
          <nav className="mt-10 flex gap-6 border-b hairline">
            {(["login", "register"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id);
                  setError(null);
                }}
                aria-current={mode === id ? "page" : undefined}
                className={`label relative -mb-px pb-3 transition-colors ${
                  mode === id ? "text-strong" : "text-muted hover:text-strong"
                }`}
              >
                {t(`auth.tab.${id}` as DictKey)}
                {/* Подчёркивание переезжает между вкладками одним движением */}
                {mode === id && (
                  <motion.span
                    layoutId={reduce ? undefined : "auth-tab"}
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-(--ink)"
                    transition={{ duration: 0.45, ease: EASE }}
                  />
                )}
              </button>
            ))}
          </nav>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            {/* Поле имени приезжает и уезжает вместе с режимом регистрации */}
            <AnimatePresence initial={false}>
              {register && (
                <motion.label
                  className="block overflow-hidden"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <span className="label label-muted">{t("auth.name")}</span>
                  {/* Без required: поле уезжает с анимацией, и браузер успел бы
                      пожаловаться на «невидимое обязательное поле» — имя
                      проверяем сами */}
                  <input
                    className="field mt-2"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </motion.label>
              )}
            </AnimatePresence>
            <label className="block">
              <span className="label label-muted">{t("auth.email")}</span>
              <input
                className="field mt-2"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="label label-muted">{t("auth.password")}</span>
              <input
                className="field mt-2"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 8 : undefined}
                required
              />
              {register && (
                <span className="mt-2 block text-xs text-muted">
                  {t("auth.password.hint")}
                </span>
              )}
            </label>

            <AnimatePresence>
              {error && (
                <motion.p
                  className="field-error"
                  role="alert"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {t(`auth.error.${error}` as DictKey)}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={sending}
              aria-busy={sending}
              className="btn btn-primary mt-2 w-full disabled:cursor-wait disabled:opacity-60"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={sending ? "sending" : mode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {sending
                    ? t("auth.sending")
                    : register
                      ? t("auth.submit.register")
                      : t("auth.submit.login")}
                </motion.span>
              </AnimatePresence>
            </button>
          </form>

          {!register && (
            <p className="mt-6 text-xs leading-relaxed text-muted">
              {t("auth.forgot")}{" "}
              <a href={`mailto:${seller.email}`} className="link-quiet">
                {seller.email}
              </a>
            </p>
          )}
          <p className="mt-8 text-xs text-muted">
            <Link href="/offer" className="link-quiet">
              {t("footer.offer")}
            </Link>
            <span aria-hidden="true"> · </span>
            <Link href="/privacy" className="link-quiet">
              {t("footer.privacy")}
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** useSearchParams требует границы Suspense — иначе страница целиком
    выпадает из пререндера. */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <AuthForm />
    </Suspense>
  );
}
