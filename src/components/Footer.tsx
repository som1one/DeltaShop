"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { seller, sellerLines } from "@/lib/legal";

export default function Footer() {
  const { lang, t } = useLang();
  return (
    <footer className="dark-stage relative">
      <div className="measure gutter pb-10 pt-20 md:pt-28">
        {/* Big wordmark */}
        <div className="flex items-center gap-3 md:gap-8">
          <span className="display text-chrome text-[8.5vw] leading-none md:text-[7vw]">
            Forma
          </span>
          {/* The real mark from the longsleeve print — optically matched to
              the caps (a round shape needs a slight overshoot) */}
          <Image
            src="/logo-crescent-512.png"
            alt=""
            width={512}
            height={473}
            className="w-[7vw] shrink-0 md:w-[5.7vw]"
          />
          <span className="display text-chrome text-[8.5vw] leading-none md:text-[7vw]">
            Visual
          </span>
        </div>
        <p className="label label-muted mt-6">{t("footer.tagline")}</p>

        <div className="mt-16 grid grid-cols-2 gap-10 border-t hairline pt-10 md:grid-cols-4">
          <div>
            <h3 className="label label-muted mb-5">{t("footer.shop")}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/visual" className="link-quiet">
                  {t("nav.visual")}
                </Link>
              </li>
              <li>
                <Link href="/forma" className="link-quiet">
                  {t("nav.forma")}
                </Link>
              </li>
              <li>
                <Link href="/partners" className="link-quiet">
                  {t("nav.partners")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="label label-muted mb-5">{t("footer.info")}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/delivery" className="link-quiet">
                  {t("footer.delivery")}
                </Link>
              </li>
              <li>
                <Link href="/returns" className="link-quiet">
                  {t("footer.returns")}
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="link-quiet">
                  {t("footer.contacts")}
                </Link>
              </li>
              <li>
                <Link href="/order" className="link-quiet">
                  {t("order.lookup.title")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="label label-muted mb-5">{t("footer.legal")}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/offer" className="link-quiet">
                  {t("footer.offer")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="link-quiet">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/partner-terms" className="link-quiet">
                  {t("partners.rules")}
                </Link>
              </li>
            </ul>
          </div>
          {/* Реквизиты продавца — ОГРНИП и ИНН обязаны быть на витрине.
              Незаполненные поля выпадают из списка сами. */}
          <div>
            <h3 className="label label-muted mb-5">{t("footer.requisites")}</h3>
            {/* break-words: почта и пятнадцатизначный ОГРНИП не влезают
                в узкую колонку на телефоне */}
            <ul className="space-y-3 break-words text-sm text-(--text-on-dark-muted)">
              {sellerLines(lang).map((line) => (
                <li key={line.label || line.value}>
                  {line.label ? `${line.label} ${line.value}` : line.value}
                </li>
              ))}
              <li>
                <a href={`mailto:${seller.email}`} className="link-quiet">
                  {seller.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t hairline pt-6 text-xs text-(--text-on-dark-muted) md:flex-row md:items-center md:justify-between">
          <span>© 2026 FORMA VISUAL</span>
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}
