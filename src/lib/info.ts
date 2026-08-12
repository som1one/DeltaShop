import type { Lang } from "./i18n";

export type InfoLink = { label: string; href: string; external?: boolean };

export type InfoSection = {
  heading: string;
  paragraphs: string[];
  links?: InfoLink[];
};

export type InfoPageContent = {
  title: string;
  sections: InfoSection[];
};

export const infoPages: Record<
  "delivery" | "returns" | "contacts",
  Record<Lang, InfoPageContent>
> = {
  delivery: {
    ru: {
      title: "Доставка и оплата",
      sections: [
        {
          heading: "По СНГ",
          paragraphs: [
            "Заказы везёт СДЭК — до пункта выдачи или курьером до двери. Обычно это 2–7 дней, стоимость считается при оформлении.",
            "Как только соберём заказ, пришлём трек-номер на почту.",
          ],
        },
        {
          heading: "Остальной мир",
          paragraphs: [
            "Международные заказы едут 7–14 дней.",
            "Пошлины и сборы страны назначения оплачивает получатель.",
          ],
        },
        {
          heading: "Оплата",
          paragraphs: [
            "ЮKassa — банковские карты, СБП и электронные кошельки.",
            "Деньги списываются один раз, чек приходит на почту.",
          ],
        },
      ],
    },
    en: {
      title: "Shipping & payment",
      sections: [
        {
          heading: "Across CIS",
          paragraphs: [
            "Orders travel with CDEK — to a pickup point or by courier to your door. Usually 2–7 days; the cost is calculated at checkout.",
            "As soon as the order ships, the tracking number lands in your inbox.",
          ],
        },
        {
          heading: "Worldwide",
          paragraphs: [
            "International orders take 7–14 days.",
            "Destination duties and fees are covered by the recipient.",
          ],
        },
        {
          heading: "Payment",
          paragraphs: [
            "YooKassa — bank cards, SBP and wallets.",
            "You are charged once; the receipt arrives by email.",
          ],
        },
      ],
    },
  },
  returns: {
    ru: {
      title: "Возврат",
      sections: [
        {
          heading: "Условия",
          paragraphs: [
            "На возврат — 14 дней с момента получения.",
            "Одежду принимаем без следов носки и с бирками. Средства ухода — только если упаковка не вскрыта.",
          ],
        },
        {
          heading: "Как оформить",
          paragraphs: [
            "Напишите нам с номером заказа — пришлём инструкцию и адрес для отправки. Обратную доставку по браку берём на себя.",
          ],
          links: [
            {
              label: "hello@formavisual.shop",
              href: "mailto:hello@formavisual.shop",
            },
          ],
        },
        {
          heading: "Деньги",
          paragraphs: [
            "Вернём тем же способом, каким вы платили, — в течение 3–10 дней после того, как получим посылку.",
          ],
        },
      ],
    },
    en: {
      title: "Returns",
      sections: [
        {
          heading: "Terms",
          paragraphs: [
            "You have 14 days from delivery to return an order.",
            "Clothing comes back unworn, tags on. Skincare — only if the packaging is sealed.",
          ],
        },
        {
          heading: "How it works",
          paragraphs: [
            "Write to us with your order number — we will send instructions and the return address. If an item is faulty, return shipping is on us.",
          ],
          links: [
            {
              label: "hello@formavisual.shop",
              href: "mailto:hello@formavisual.shop",
            },
          ],
        },
        {
          heading: "Refund",
          paragraphs: [
            "We refund to the same payment method within 3–10 days of receiving the parcel.",
          ],
        },
      ],
    },
  },
  contacts: {
    ru: {
      title: "Контакты",
      sections: [
        {
          heading: "Почта",
          paragraphs: ["По заказам, возвратам и всему остальному. Отвечаем в течение суток по будням."],
          links: [
            {
              label: "hello@formavisual.shop",
              href: "mailto:hello@formavisual.shop",
            },
          ],
        },
        {
          heading: "Партнёрам",
          paragraphs: [
            "Про сотрудничество и 25% с продаж — на странице партнёрской программы.",
          ],
          links: [{ label: "Партнёрская программа", href: "/partners" }],
        },
        {
          heading: "Соцсети",
          paragraphs: ["Новости, дропы и закулисье — там."],
          links: [
            {
              label: "Telegram",
              href: "https://t.me/formavisual",
              external: true,
            },
            {
              label: "Instagram",
              href: "https://instagram.com/formavisual",
              external: true,
            },
          ],
        },
      ],
    },
    en: {
      title: "Contacts",
      sections: [
        {
          heading: "Email",
          paragraphs: [
            "Orders, returns and everything else. We reply within a business day.",
          ],
          links: [
            {
              label: "hello@formavisual.shop",
              href: "mailto:hello@formavisual.shop",
            },
          ],
        },
        {
          heading: "Partners",
          paragraphs: [
            "Collaboration and the 25% programme live on the partners page.",
          ],
          links: [{ label: "Partner programme", href: "/partners" }],
        },
        {
          heading: "Social",
          paragraphs: ["News, drops and behind the scenes."],
          links: [
            {
              label: "Telegram",
              href: "https://t.me/formavisual",
              external: true,
            },
            {
              label: "Instagram",
              href: "https://instagram.com/formavisual",
              external: true,
            },
          ],
        },
      ],
    },
  },
};
