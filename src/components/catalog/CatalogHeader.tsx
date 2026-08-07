"use client";

import Reveal from "@/components/Reveal";
import { plural, useLang, type DictKey } from "@/lib/i18n";

/**
 * Shared catalogue intro: eyebrow, oversized house name,
 * an optional editorial paragraph beside/under the title,
 * a hairline rule and the item count.
 */
export default function CatalogHeader({
  subKey,
  titleKey,
  count,
  introKey,
}: {
  subKey: DictKey;
  titleKey: DictKey;
  count: number;
  introKey?: DictKey;
}) {
  const { lang, t } = useLang();
  const countLabel = plural(lang, count, {
    one: t("catalog.items.one"),
    few: t("catalog.items.few"),
    many: t("catalog.items.many"),
  });

  return (
    <Reveal>
      <p className="label label-muted">{t(subKey)}</p>
      <div className="mt-5 flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
        <h1 className="display text-6xl md:text-8xl">{t(titleKey)}</h1>
        {introKey ? (
          <Reveal delay={0.2} y={16} className="lg:pb-3">
            <p className="max-w-md text-[15px] text-muted">{t(introKey)}</p>
          </Reveal>
        ) : null}
      </div>
      <div className="mt-10 border-t hairline md:mt-14" />
      <p className="label label-muted mt-4">
        {count} {countLabel}
      </p>
    </Reveal>
  );
}
