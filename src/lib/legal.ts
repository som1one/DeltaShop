import type { Lang } from "./i18n";
import type { InfoPageContent } from "./info";

/* ————————————————————————————————————————————————
   Реквизиты продавца — единственное место, где они живут. Подвал,
   оферта и политика конфиденциальности берут данные отсюда, так что
   правка нужна только здесь.

   TODO: заменить заглушки на настоящие данные из ЕГРИП. Пустая строка
   означает «поля нет» — такая строка не появится ни в подвале, ни в
   документах, поэтому лишнее лучше стирать, а не заполнять прочерком.
   ———————————————————————————————————————————————— */

export type SellerDetails = {
  brand: string;
  site: string;
  /** ФИО предпринимателя, как в ЕГРИП */
  name: Record<Lang, string>;
  ogrnip: string;
  inn: string;
  /** Адрес для писем и возвратов */
  address: Record<Lang, string>;
  email: string;
  phone: string;
  /** Дата редакции документов */
  updated: Record<Lang, string>;
};

export const seller: SellerDetails = {
  brand: "FORMA VISUAL",
  site: "formavisual.shop",
  name: {
    ru: "ИП Фамилия Имя Отчество",
    en: "Sole proprietor Familiya Imya Otchestvo",
  },
  ogrnip: "000000000000000",
  inn: "000000000000",
  address: { ru: "", en: "" },
  email: "hello@formavisual.shop",
  phone: "",
  updated: { ru: "14 августа 2026 года", en: "14 August 2026" },
};

export type SellerLine = { label: string; value: string };

const LINE_LABELS: Record<
  Lang,
  { ogrnip: string; inn: string; address: string; email: string; phone: string }
> = {
  ru: {
    ogrnip: "ОГРНИП",
    inn: "ИНН",
    address: "Адрес",
    email: "Почта",
    phone: "Телефон",
  },
  en: {
    ogrnip: "OGRNIP",
    inn: "INN",
    address: "Address",
    email: "Email",
    phone: "Phone",
  },
};

/** Реквизиты построчно; незаполненные поля выпадают сами. */
export function sellerLines(
  lang: Lang,
  opts?: { contacts?: boolean },
): SellerLine[] {
  const l = LINE_LABELS[lang];
  const lines: SellerLine[] = [
    { label: "", value: seller.name[lang] },
    { label: l.ogrnip, value: seller.ogrnip },
    { label: l.inn, value: seller.inn },
    { label: l.address, value: seller.address[lang] },
  ];
  if (opts?.contacts) {
    lines.push(
      { label: l.email, value: seller.email },
      { label: l.phone, value: seller.phone },
    );
  }
  return lines.filter((line) => line.value !== "");
}

/** Те же реквизиты одной строкой на абзац — для текста документов. */
export function sellerText(lang: Lang, opts?: { contacts?: boolean }) {
  return sellerLines(lang, opts).map((line) =>
    line.label ? `${line.label} ${line.value}` : line.value,
  );
}

/* ————————————————————————————————————————————————
   Документы. Верстаются тем же InfoPage, что и доставка с возвратом:
   заголовок раздела слева, текст справа.
   ———————————————————————————————————————————————— */

export const privacyPolicy: Record<Lang, InfoPageContent> = {
  ru: {
    title: "Политика конфиденциальности",
    sections: [
      {
        heading: "Кто обрабатывает",
        paragraphs: [
          `Персональные данные посетителей сайта ${seller.site} обрабатывает ${sellerText(
            "ru",
          ).join(", ")} — далее «мы».`,
          "Работаем по Федеральному закону № 152-ФЗ «О персональных данных». Оформляя заказ или отправляя заявку, вы соглашаетесь с этой политикой.",
        ],
      },
      {
        heading: "Какие данные",
        paragraphs: [
          "Имя, электронная почта, телефон, город и адрес доставки — всё, что вы сами вводите при оформлении заказа или в заявке партнёра.",
          "Состав заказа, его номер и статус — чтобы вы могли отследить посылку.",
          "У партнёров программы — имя получателя и номер телефона или расчётного счёта: без них перевести вознаграждение некуда.",
          "Реквизиты карты мы не получаем и не храним: оплата целиком проходит на стороне ЮKassa, номера банковских карт партнёров мы не принимаем вовсе.",
        ],
      },
      {
        heading: "Зачем",
        paragraphs: [
          "Принять и собрать заказ, передать его в доставку, прислать чек и трек-номер, ответить на ваше письмо.",
          "Выполнить требования закона — бухгалтерский и налоговый учёт, кассовые чеки.",
          "Рассчитать вознаграждение партнёра, если вы участвуете в программе.",
          "Мы не продаём данные и не рассылаем рекламу без отдельного согласия.",
        ],
      },
      {
        heading: "Кому передаём",
        paragraphs: [
          "ЮKassa — приём оплаты и фискальный чек.",
          "СДЭК — доставка: имя, телефон, адрес получателя.",
          "Хостинг-провайдер, на серверах которого работает сайт.",
          "Больше никому, кроме случаев, прямо предусмотренных законом.",
        ],
      },
      {
        heading: "Где и сколько храним",
        paragraphs: [
          "Базы данных находятся на серверах в России.",
          "Данные заказов храним, пока этого требует бухгалтерский и налоговый учёт. Заявки партнёров — пока действует программа или до отзыва согласия.",
          "Доступ к данным есть только у тех, кому он нужен для работы с заказами.",
        ],
      },
      {
        heading: "Ваши права",
        paragraphs: [
          "Вы можете узнать, какие данные у нас есть, исправить их, отозвать согласие или попросить удалить.",
          "Напишите на почту — ответим в течение 30 дней, обычно быстрее.",
        ],
        links: [{ label: seller.email, href: `mailto:${seller.email}` }],
      },
      {
        heading: "Что хранит браузер",
        paragraphs: [
          "В локальном хранилище браузера лежат выбранный язык, корзина и ссылка на последний заказ. Это нужно, чтобы сайт работал.",
          "Переход по партнёрской ссылке оставляет служебную куку с кодом партнёра на 30 дней — по ней заказ засчитывается тому, кто вас привёл. Сам переход мы считаем по необратимому хешу от адреса и браузера, адрес не сохраняем.",
          "Рекламных и аналитических трекеров на сайте нет.",
        ],
      },
      {
        heading: "Изменения",
        paragraphs: [
          "Новая редакция публикуется на этой странице.",
          `Действующая редакция — от ${seller.updated.ru}.`,
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    sections: [
      {
        heading: "Who processes",
        paragraphs: [
          `Personal data of ${seller.site} visitors is processed by ${sellerText(
            "en",
          ).join(", ")} — “we” below.`,
          "We follow Federal Law No. 152-FZ on personal data. Placing an order or sending an application means you accept this policy.",
        ],
      },
      {
        heading: "What we collect",
        paragraphs: [
          "Name, email, phone, city and delivery address — everything you type at checkout or in a partner application.",
          "Order contents, number and status — so you can track the parcel.",
          "For programme partners — the recipient name and a phone or bank account number: without them there is nowhere to send the commission.",
          "We never receive or store card details: payment happens entirely on the YooKassa side, and we do not take partners' card numbers at all.",
        ],
      },
      {
        heading: "Why",
        paragraphs: [
          "To take and assemble the order, hand it to the carrier, send the receipt and tracking number, and answer your email.",
          "To meet legal requirements — accounting, tax records, fiscal receipts.",
          "To calculate partner commission if you are in the programme.",
          "We do not sell data and do not send marketing without separate consent.",
        ],
      },
      {
        heading: "Who else sees it",
        paragraphs: [
          "YooKassa — payment processing and the fiscal receipt.",
          "CDEK — delivery: recipient name, phone and address.",
          "The hosting provider running the site.",
          "Nobody else, except where the law directly requires it.",
        ],
      },
      {
        heading: "Where and how long",
        paragraphs: [
          "The databases sit on servers in Russia.",
          "Order data is kept as long as accounting and tax rules require. Partner applications — while the programme runs or until consent is withdrawn.",
          "Access is limited to the people who need it to handle orders.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You may ask what data we hold, correct it, withdraw consent or ask us to delete it.",
          "Write to us — we reply within 30 days, usually sooner.",
        ],
        links: [{ label: seller.email, href: `mailto:${seller.email}` }],
      },
      {
        heading: "What the browser keeps",
        paragraphs: [
          "Local storage holds your language, your cart and a link to the last order. That is what makes the site work.",
          "Following a partner link leaves a service cookie with the partner code for 30 days — it is how an order is credited to whoever brought you. The visit itself is counted through an irreversible hash of the address and browser; the address is not stored.",
          "There are no advertising or analytics trackers on the site.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: [
          "Any new version is published on this page.",
          `Current version — ${seller.updated.en}.`,
          "The Russian text of this policy prevails.",
        ],
      },
    ],
  },
};

/**
 * Правила партнёрской программы. Оферта — договор купли-продажи, партнёрское
 * вознаграждение она не покрывает, поэтому документ отдельный. Версия
 * фиксируется в заявке: видно, с чем именно человек согласился.
 */
export const partnerTerms: Record<Lang, InfoPageContent> = {
  ru: {
    title: "Правила партнёрской программы",
    sections: [
      {
        heading: "Кто участвует",
        paragraphs: [
          "Участником может стать любой покупатель с учётной записью на сайте: заявка подаётся из кабинета, решение принимаем вручную и показываем там же.",
          "Вознаграждение переводим только самозанятым и индивидуальным предпринимателям. Самозанятый выдаёт чек из «Мой налог» на сумму перевода, ИП — работает по своим документам. Налоги партнёр платит сам.",
        ],
        links: [{ label: "Кабинет", href: "/account" }],
      },
      {
        heading: "Ссылка и код",
        paragraphs: [
          "После одобрения в кабинете появляется личная ссылка, которая заканчивается на /r/КОД. Код — восемь знаков в её конце; по нему мы узнаём, что покупатель пришёл от вас. Полную ссылку всегда видно в кабинете — копируйте её оттуда.",
          "Переход по ссылке ставит в браузере метку на 30 дней. Если за это время человек оплатит заказ, заказ засчитается вам. Новый переход по чужой ссылке метку перезаписывает — считается последний переход.",
          "Ссылку можно направить на любую страницу магазина: выберите её в кабинете, адрес соберётся сам.",
        ],
      },
      {
        heading: "Что засчитывается",
        paragraphs: [
          "Засчитывается оплаченный заказ, оформленный с меткой вашей ссылки.",
          "Не засчитываются: заказы с вашей собственной учётной записи или на вашу почту, заказы отменённые и возвращённые, а также заказы, оплату которых платёжная система не подтвердила. Покупка самому себе через другую учётную запись — нарушение правил: заметим — снимем начисление и закроем участие.",
          "Переходы по ссылке мы показываем в кабинете, но не оплачиваем — деньги приносит только оплаченный заказ.",
        ],
      },
      {
        heading: "Сколько и с чего",
        paragraphs: [
          "Вознаграждение — 25% от суммы заказа. Ставка записывается в каждое начисление в момент его появления: если мы изменим процент, прежние начисления останутся прежними.",
          "Считаем с суммы товаров в заказе. Доставка в сумму заказа не входит и в расчёт не попадает.",
        ],
      },
      {
        heading: "Когда можно забрать",
        paragraphs: [
          "Начисление появляется в кабинете сразу после оплаты заказа — со сроком проверки: 14 дней после доставки, потому что столько у покупателя есть на возврат.",
          "Если отметки о доставке не появилось, начисление подтверждается через 45 дней после оплаты — чтобы деньги не зависли из-за нашей забывчивости.",
          "Подтверждённые начисления собираются в выплату. Отменённое начисление не исчезает: оно остаётся в списке с причиной.",
        ],
      },
      {
        heading: "Выплата",
        paragraphs: [
          "Переводим по СБП на номер телефона или на расчётный счёт. Номера банковских карт не принимаем и не храним.",
          "Реквизиты запрашиваем только когда появилось первое начисление: раньше они нам не нужны.",
          "Выплату собираем по запросу после того, как начисления подтверждены. Напишите нам из кабинета — соберём и переведём.",
        ],
        links: [
          { label: seller.email, href: `mailto:${seller.email}` },
        ],
      },
      {
        heading: "Чего мы не делаем",
        paragraphs: [
          "Не передаём партнёру данные покупателей: в кабинете видны только дата, номер заказа, его сумма и ваше вознаграждение.",
          "Не начисляем задним числом по заказам, оформленным без метки.",
          "Не платим за переходы, показы и подписчиков.",
        ],
      },
      {
        heading: "Данные партнёра",
        paragraphs: [
          "Для выплаты храним имя получателя и номер телефона или счёта — больше ничего. Переходы считаем по необратимому хешу от адреса, сам адрес не храним.",
          "Всё остальное — в политике конфиденциальности.",
        ],
        links: [
          { label: "Политика конфиденциальности", href: "/privacy" },
        ],
      },
      {
        heading: "Изменения",
        paragraphs: [
          "Новая редакция публикуется на этой странице. К уже начисленному вознаграждению новые условия не применяются.",
          `Действующая редакция — от ${seller.updated.ru}.`,
        ],
      },
    ],
  },
  en: {
    title: "Partner programme rules",
    sections: [
      {
        heading: "Who takes part",
        paragraphs: [
          "Any customer with an account can apply from the cabinet. We review applications by hand and show the decision in the same place.",
          "We pay self-employed persons and sole proprietors only. A self-employed partner issues a receipt from the “Moy Nalog” service for the transferred amount; a sole proprietor works under their own paperwork. Taxes are the partner's own responsibility.",
        ],
        links: [{ label: "Account", href: "/account" }],
      },
      {
        heading: "The link and the code",
        paragraphs: [
          "Once approved, your personal link appears in the cabinet and ends with /r/CODE. The code is the eight characters at the end — that is how we know the buyer came from you. The full link is always visible in the cabinet; copy it from there.",
          "Following the link places a mark in the browser for 30 days. If the person pays for an order within that time, the order counts as yours. A later visit through someone else's link overwrites the mark — the last visit wins.",
          "The link can point at any page of the shop: pick it in the cabinet and the address assembles itself.",
        ],
      },
      {
        heading: "What counts",
        paragraphs: [
          "A paid order placed with your mark counts.",
          "These do not: orders from your own account or to your email, cancelled and returned orders, and orders whose payment the provider did not confirm. Buying from yourself through another account breaks the rules: if we notice, the commission is removed and participation ends.",
          "Visits are shown in the cabinet but never paid for — only a paid order brings money.",
        ],
      },
      {
        heading: "How much and from what",
        paragraphs: [
          "The commission is 25% of the order total. The rate is written into every commission when it appears: changing the percentage later does not rewrite past commissions.",
          "We count from the goods in the order. Shipping is not part of the order total and does not take part in the calculation.",
        ],
      },
      {
        heading: "When you can take it",
        paragraphs: [
          "The commission appears in the cabinet right after the order is paid, with a holding period: 14 days after delivery, because that is how long the buyer has to return the goods.",
          "If no delivery mark appears, the commission is confirmed 45 days after payment — so that our forgetfulness never freezes your money.",
          "Confirmed commissions are collected into a payout. A cancelled commission does not vanish: it stays in the list with its reason.",
        ],
      },
      {
        heading: "Payout",
        paragraphs: [
          "We transfer via SBP to a phone number or to a bank account. We never take or store card numbers.",
          "Payout details are requested only once the first commission appears — we do not need them earlier.",
          "A payout is assembled on request once commissions are confirmed. Write to us from the cabinet and we will send it.",
        ],
        links: [{ label: seller.email, href: `mailto:${seller.email}` }],
      },
      {
        heading: "What we never do",
        paragraphs: [
          "We do not pass customer data to partners: the cabinet shows only the date, order number, order total and your commission.",
          "We do not backdate commissions for orders placed without a mark.",
          "We do not pay for visits, impressions or followers.",
        ],
      },
      {
        heading: "Partner data",
        paragraphs: [
          "For payouts we keep the recipient name and a phone or account number — nothing else. Visits are counted through an irreversible hash of the address; the address itself is not stored.",
          "Everything else is in the privacy policy.",
        ],
        links: [{ label: "Privacy policy", href: "/privacy" }],
      },
      {
        heading: "Changes",
        paragraphs: [
          "Any new version is published on this page. New terms never apply to commissions already accrued.",
          `Current version — ${seller.updated.en}. The Russian text prevails.`,
        ],
      },
    ],
  },
};

export const publicOffer: Record<Lang, InfoPageContent> = {
  ru: {
    title: "Публичная оферта",
    sections: [
      {
        heading: "Что это за документ",
        paragraphs: [
          `${seller.name.ru} (далее — «Продавец») предлагает любому посетителю сайта ${seller.site} заключить договор розничной купли-продажи на условиях ниже. Документ является публичной офертой по статьям 435 и 437 Гражданского кодекса РФ.`,
          "Оформление и оплата заказа означают полное согласие с этими условиями (акцепт, статья 438 ГК РФ). Договор считается заключённым с момента оплаты.",
        ],
      },
      {
        heading: "Товар",
        paragraphs: [
          "Продавец продаёт одежду Visual и средства ухода Forma, представленные в каталоге сайта.",
          "Описание, состав, размеры и цвет указаны на странице товара. Оттенок на экране может немного отличаться от реального — это особенность цветопередачи мониторов, а не недостаток товара.",
          "Если товара не окажется в наличии, мы свяжемся с вами и предложим замену или вернём деньги.",
        ],
      },
      {
        heading: "Заказ",
        paragraphs: [
          "Заказ оформляется на сайте: вы выбираете товары и указываете имя, почту, телефон, город и адрес доставки.",
          "Указывая данные, вы подтверждаете, что они верны. Заказ подтверждается письмом на указанную почту.",
        ],
      },
      {
        heading: "Цена и оплата",
        paragraphs: [
          "Цены указаны в рублях. Стоимость доставки считается при оформлении и показывается до оплаты.",
          "Оплата проходит через ЮKassa: банковские карты, СБП и электронные кошельки. Кассовый чек приходит на указанную почту.",
          "Продавец вправе менять цены, но для уже оплаченного заказа цена остаётся прежней.",
        ],
      },
      {
        heading: "Доставка",
        paragraphs: [
          "По СНГ заказы везёт СДЭК — до пункта выдачи или курьером. Международные отправления идут дольше, пошлины страны назначения оплачивает получатель.",
          "Сроки зависят от службы доставки и указаны ориентировочно. Трек-номер приходит на почту, как только заказ передан в доставку.",
        ],
        links: [{ label: "Доставка и оплата", href: "/delivery" }],
      },
      {
        heading: "Возврат",
        paragraphs: [
          "Отказаться от товара надлежащего качества можно в течение 14 дней с момента получения, если сохранены товарный вид и потребительские свойства: одежда — неношеная и с бирками, средства ухода — с невскрытой упаковкой.",
          "Если товар с недостатком, замену или возврат делаем за свой счёт по статье 18 Закона «О защите прав потребителей».",
          "Деньги возвращаем тем же способом, каким вы платили, — в течение 10 дней после того, как получим посылку.",
        ],
        links: [{ label: "Возврат", href: "/returns" }],
      },
      {
        heading: "Ответственность",
        paragraphs: [
          "Стороны отвечают по законодательству РФ. Обстоятельства непреодолимой силы освобождают от ответственности на время их действия.",
          "Претензии принимаем на почту и отвечаем в течение 10 рабочих дней. Споры решаем переговорами, а если не вышло — в суде по правилам подсудности для потребителей.",
        ],
        links: [{ label: seller.email, href: `mailto:${seller.email}` }],
      },
      {
        heading: "Персональные данные",
        paragraphs: [
          "Данные покупателя обрабатываются по 152-ФЗ и нашей политике конфиденциальности.",
        ],
        links: [
          { label: "Политика конфиденциальности", href: "/privacy" },
        ],
      },
      {
        heading: "Реквизиты продавца",
        paragraphs: [
          ...sellerText("ru", { contacts: true }),
          `Редакция от ${seller.updated.ru}.`,
        ],
      },
    ],
  },
  en: {
    title: "Public offer",
    sections: [
      {
        heading: "What this is",
        paragraphs: [
          `${seller.name.en} (“the Seller”) offers any visitor of ${seller.site} to enter into a retail purchase agreement on the terms below. The document is a public offer under articles 435 and 437 of the Civil Code of Russia.`,
          "Placing and paying for an order means full acceptance of these terms (article 438). The agreement takes effect at the moment of payment.",
        ],
      },
      {
        heading: "Goods",
        paragraphs: [
          "The Seller sells Visual clothing and Forma skincare presented in the catalogue.",
          "Description, composition, sizes and colour are stated on the product page. On-screen colour may differ slightly from the real thing — that is how monitors render colour, not a defect.",
          "If an item turns out to be out of stock, we contact you and offer a replacement or a refund.",
        ],
      },
      {
        heading: "Order",
        paragraphs: [
          "Orders are placed on the site: you pick the items and give your name, email, phone, city and delivery address.",
          "By entering them you confirm the details are correct. The order is confirmed by an email to the address you gave.",
        ],
      },
      {
        heading: "Price and payment",
        paragraphs: [
          "Prices are shown in roubles. Shipping is calculated at checkout and displayed before payment.",
          "Payment runs through YooKassa: bank cards, SBP and wallets. The fiscal receipt arrives by email.",
          "The Seller may change prices, but a paid order keeps the price it was paid at.",
        ],
      },
      {
        heading: "Delivery",
        paragraphs: [
          "Across the CIS orders travel with CDEK — to a pickup point or by courier. International parcels take longer; destination duties are covered by the recipient.",
          "Timings depend on the carrier and are indicative. The tracking number is emailed as soon as the parcel ships.",
        ],
        links: [{ label: "Shipping & payment", href: "/delivery" }],
      },
      {
        heading: "Returns",
        paragraphs: [
          "You may return an item of proper quality within 14 days of delivery if its condition and properties are intact: clothing unworn with tags on, skincare with the packaging sealed.",
          "If an item is faulty, replacement or refund is on us, under article 18 of the Consumer Rights Protection Act.",
          "Refunds go back to the original payment method within 10 days of the parcel reaching us.",
        ],
        links: [{ label: "Returns", href: "/returns" }],
      },
      {
        heading: "Liability",
        paragraphs: [
          "The parties are liable under Russian law. Force majeure suspends liability while it lasts.",
          "Claims are accepted by email and answered within 10 business days. Disputes are settled by negotiation, and failing that in court under the rules of jurisdiction for consumers.",
        ],
        links: [{ label: seller.email, href: `mailto:${seller.email}` }],
      },
      {
        heading: "Personal data",
        paragraphs: [
          "Customer data is processed under law 152-FZ and our privacy policy.",
        ],
        links: [{ label: "Privacy policy", href: "/privacy" }],
      },
      {
        heading: "Seller details",
        paragraphs: [
          ...sellerText("en", { contacts: true }),
          `Version of ${seller.updated.en}. The Russian text of this offer prevails.`,
        ],
      },
    ],
  },
};
