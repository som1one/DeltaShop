"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { useModalBehavior } from "@/lib/use-modal";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Nav link with a pass-through underline: enters from the left on hover,
 * exits to the right on leave. Mount/unmount via AnimatePresence keeps
 * rapid re-hovers glitch-free — an interrupted line finishes its exit
 * while a fresh one enters, instead of jumping anchors mid-flight.
 */
function NavUnderlineLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  return (
    <Link
      href={href}
      className="label relative whitespace-nowrap"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-[3px] h-px overflow-hidden"
      >
        <AnimatePresence>
          {hover && (
            <motion.span
              className="absolute inset-0 bg-current"
              initial={reduce ? { opacity: 0 } : { x: "-101%" }}
              animate={reduce ? { opacity: 1 } : { x: "0%" }}
              exit={reduce ? { opacity: 0 } : { x: "101%" }}
              transition={{ duration: 0.45, ease: EASE }}
            />
          )}
        </AnimatePresence>
      </span>
    </Link>
  );
}

export default function Header() {
  const { lang, setLang, t } = useLang();
  const cart = useCart();
  const { user } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const menuRef = useModalBehavior<HTMLDivElement>(menuOpen, closeMenu);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /* Over the untouched hero the header blends (white text inverts per side);
     after scroll it settles onto bone. */
  const blending = !scrolled && !menuOpen;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-500 ${
          blending
            ? "mix-blend-difference text-white"
            : "bg-bone/90 backdrop-blur-md border-b hairline text-strong"
        }`}
      >
        <div className="measure gutter relative flex h-16 items-center justify-between gap-3 md:h-[72px]">
          {/* Full nav — needs room, so it waits for lg */}
          <nav
            aria-label="Main"
            className="hidden items-center gap-8 lg:flex"
          >
            <NavUnderlineLink href="/visual">{t("nav.visual")}</NavUnderlineLink>
            <NavUnderlineLink href="/forma">{t("nav.forma")}</NavUnderlineLink>
            <NavUnderlineLink href="/partners">
              {t("nav.partners")}
            </NavUnderlineLink>
          </nav>

          {/* Compact: menu button */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              className="label -ml-1 p-1 text-[10px] tracking-[0.18em]"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
            >
              {t("nav.menu")}
            </button>
          </div>

          {/* Wordmark — the real print mark; inverts to dark once the
              header settles onto bone */}
          <Link
            href="/"
            aria-label="FORMA VISUAL"
            className="display absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap text-[10px] tracking-[0.12em] min-[360px]:gap-1.5 min-[360px]:text-[11px] min-[360px]:tracking-[0.14em] sm:gap-2 sm:text-[13px] sm:tracking-[0.22em] md:gap-3 md:text-base md:tracking-[0.32em]"
          >
            FORMA
            <Image
              src="/logo-crescent-small.png"
              alt=""
              width={20}
              height={18}
              className={`w-4 shrink-0 transition-[filter] duration-500 md:w-5 ${
                blending ? "" : "invert"
              }`}
            />
            VISUAL
          </Link>

          {/* Right side — the language switch lives in the menu below lg */}
          <div className="flex items-center justify-end gap-6 lg:gap-8">
            <Link
              href={user ? "/account" : "/login"}
              className="label link-quiet hidden lg:block"
            >
              {user ? t("nav.account") : t("nav.login")}
            </Link>
            <button
              type="button"
              className="label link-quiet hidden lg:block"
              onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              aria-label={
                lang === "ru" ? "Switch to English" : "Переключить на русский"
              }
            >
              {t("lang.switch")}
            </button>
            <button
              type="button"
              className="label link-quiet whitespace-nowrap text-[10px] tracking-[0.14em] sm:tracking-[0.18em] md:text-[11px] md:tracking-[0.22em]"
              onClick={cart.open}
            >
              {t("nav.cart")}
              <span aria-hidden="true"> · </span>
              {cart.count}
            </button>
          </div>
        </div>
      </header>

      {/* Menu overlay (below lg) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            data-lenis-prevent
            className="dark-stage fixed inset-0 z-50 flex flex-col overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="gutter flex h-16 shrink-0 items-center justify-between">
              <span className="display flex items-center gap-3 text-[15px] tracking-[0.32em]">
                FORMA
                <Image
                  src="/logo-crescent-small.png"
                  alt=""
                  width={18}
                  height={17}
                  className="shrink-0"
                />
                VISUAL
              </span>
              <button
                type="button"
                className="label p-1"
                onClick={closeMenu}
              >
                {t("nav.close")}
              </button>
            </div>
            <nav
              aria-label="Mobile"
              className="gutter flex flex-1 flex-col justify-center gap-2 py-8"
            >
              {(
                [
                  ["/visual", t("hero.visual.title"), t("hero.visual.tag")],
                  ["/forma", t("hero.forma.title"), t("hero.forma.tag")],
                  ["/partners", t("nav.partners"), "25%"],
                ] as const
              ).map(([href, title, tag], i) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      delay: 0.1 + i * 0.07,
                      duration: 0.6,
                      ease: EASE,
                    },
                  }}
                >
                  <Link
                    href={href}
                    className="group flex items-baseline gap-4 border-b hairline py-5"
                  >
                    <span className="display text-4xl">{title}</span>
                    <span className="label label-muted transition-colors group-hover:text-(--text-on-dark)">
                      {tag}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="gutter flex shrink-0 items-center justify-between gap-6 pb-10">
              <button
                type="button"
                className="label link-quiet"
                onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              >
                {lang === "ru" ? "English" : "Русский"}
              </button>
              <Link href={user ? "/account" : "/login"} className="label link-quiet">
                {user ? t("nav.account") : t("nav.login")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
