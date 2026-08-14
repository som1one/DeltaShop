"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import type { InfoPageContent } from "@/lib/info";
import type { DictKey, Lang } from "@/lib/i18n";
import Reveal, { RevealGroup, RevealItem } from "@/components/Reveal";

/** Shared editorial layout for the information pages. */
export default function InfoPage({
  content,
  eyebrow = "footer.info",
}: {
  content: Record<Lang, InfoPageContent>;
  /** Надзаголовок над названием — «Информация» или «Документы» */
  eyebrow?: DictKey;
}) {
  const { lang, t } = useLang();
  const page = content[lang];

  return (
    <div className="measure gutter pb-24 pt-28 md:pb-36 md:pt-40">
      <Reveal>
        <p className="label label-muted">{t(eyebrow)}</p>
        <h1 className="display mt-6 max-w-4xl break-words text-[clamp(2rem,9vw,4.5rem)] md:text-6xl">
          {page.title}
        </h1>
      </Reveal>

      <RevealGroup className="mt-14 md:mt-20">
        {page.sections.map((section) => (
          <RevealItem
            key={section.heading}
            className="grid gap-y-4 border-t hairline py-10 md:grid-cols-[240px_1fr] md:py-14"
          >
            <h2 className="label label-muted">{section.heading}</h2>
            <div className="max-w-xl">
              {section.paragraphs.map((text) => (
                <p
                  key={text}
                  className="mt-3 text-[15px] leading-relaxed first:mt-0"
                >
                  {text}
                </p>
              ))}
              {section.links && (
                <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                  {section.links.map((link) =>
                    link.external ? (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="link-quiet label"
                      >
                        {link.label} ↗
                      </a>
                    ) : (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="link-quiet label"
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
