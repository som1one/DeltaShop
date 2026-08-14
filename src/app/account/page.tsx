"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLang, type DictKey } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import Reveal from "@/components/Reveal";
import OrdersSection from "@/components/account/OrdersSection";
import ProfileSection from "@/components/account/ProfileSection";
import PartnerSection from "@/components/account/PartnerSection";

type Tab = "orders" | "profile" | "partner";

const TABS: Tab[] = ["orders", "profile", "partner"];

const EASE = [0.22, 1, 0.36, 1] as const;

/** Кабинет покупателя: заказы, профиль, партнёрская программа. */
function Cabinet() {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  /* Раздел можно открыть ссылкой: /account?tab=partner. Так с витрины
     партнёрства попадаешь сразу в партнёрский раздел, а не в заказы. */
  const requested = params.get("tab");
  const [tab, setTab] = useState<Tab>(
    TABS.includes(requested as Tab) ? (requested as Tab) : "orders",
  );

  /* Кабинет без входа не имеет смысла: уводим на форму и возвращаем обратно */
  useEffect(() => {
    if (!user) router.replace("/login?next=/account");
  }, [user, router]);

  if (!user) {
    return <div className="min-h-[60vh]" aria-busy="true" />;
  }

  const signOut = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <section className="measure gutter pb-24 pt-28 md:pb-36 md:pt-40">
      <Reveal>
        <p className="label label-muted">{t("auth.title")}</p>
        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4">
          <h1 className="display text-4xl md:text-6xl">{t("account.title")}</h1>
          <button type="button" onClick={signOut} className="label link-quiet">
            {t("account.logout")}
          </button>
        </div>
        <p className="mt-4 text-sm text-muted">
          {user.name}
          <span aria-hidden="true"> · </span>
          {user.email}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <nav
          className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-b hairline md:mt-16"
          aria-label={t("account.title")}
        >
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`label relative -mb-px pb-3 transition-colors ${
                tab === id ? "text-strong" : "text-muted hover:text-strong"
              }`}
            >
              {t(`account.tab.${id}` as DictKey)}
              {/* Подчёркивание переезжает между разделами одним движением */}
              {tab === id && (
                <motion.span
                  layoutId={reduce ? undefined : "account-tab"}
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-(--ink)"
                  transition={{ duration: 0.45, ease: EASE }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-12 md:mt-16">
          {/* Разделы подменяются перекрёстным затуханием: содержимое разной
              высоты не должно дёргать страницу */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {tab === "orders" && <OrdersSection />}
              {tab === "profile" && <ProfileSection />}
              {tab === "partner" && <PartnerSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>
    </section>
  );
}

/** useSearchParams требует границы Suspense. */
export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <Cabinet />
    </Suspense>
  );
}
