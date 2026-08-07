"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "ru" | "en";

const dictionaries = {
  ru: {
    // Navigation
    "nav.visual": "Visual — одежда",
    "nav.forma": "Forma — уход",
    "nav.partners": "Партнёрам",
    "nav.cart": "Корзина",
    "nav.menu": "Меню",
    "nav.close": "Закрыть",

    // Hero
    "hero.house": "Два дома — одна форма",
    "hero.forma.tag": "Уход за кожей",
    "hero.forma.title": "Forma",
    "hero.forma.line": "Чистые формулы. Ничего сверх того, что нужно коже.",
    "hero.forma.cta": "Смотреть уход",
    "hero.visual.tag": "Одежда",
    "hero.visual.title": "Visual",
    "hero.visual.line": "Вещи в тихих тонах — деним, бордо, хром.",
    "hero.visual.cta": "Смотреть одежду",

    // Home sections
    "home.manifesto":
      "Форма — это то, что остаётся, когда убрано лишнее. Мы делаем уход и одежду, которым не нужно повышать голос.",
    "home.featured.label": "Избранное",
    "home.featured.title": "Витрина сезона",
    "home.featured.all": "Весь каталог",
    "home.forma.label": "Forma · Уход",
    "home.forma.title": "Формула без лишнего",
    "home.forma.text":
      "Комплекс витамина C, транексамовая кислота, пантенол. Увлажняет, выравнивает тон, смягчает.",
    "home.forma.cta": "К уходу",
    "home.visual.label": "Visual · Одежда",
    "home.visual.title": "Тихая форма",
    "home.visual.text":
      "Стираный деним, глубокое бордо, серебро фурнитуры. Вещи, рассчитанные на годы.",
    "home.visual.cta": "К одежде",
    "home.partners.label": "Сотрудничество",
    "home.partners.title": "25% с каждой продажи",
    "home.partners.text":
      "Личная ссылка создаётся сама. Делитесь ею — и четверть каждой оплаты остаётся вам.",
    "home.partners.cta": "Стать партнёром",
    "home.note":
      "Доставка по СНГ и миру · Возврат в течение 14 дней · Оплата картой или по СБП",

    // Catalog
    "catalog.visual.title": "Visual",
    "catalog.visual.sub": "Одежда и аксессуары",
    "catalog.forma.title": "Forma",
    "catalog.forma.sub": "Уход за кожей",
    "catalog.items.one": "позиция",
    "catalog.items.few": "позиции",
    "catalog.items.many": "позиций",
    "catalog.soon": "Скоро",
    "catalog.soon.note": "Формула ещё в работе",

    // Product
    "product.back": "Назад в каталог",
    "product.size": "Размер",
    "product.size.one": "Один размер",
    "product.volume": "Объём",
    "product.add": "В корзину",
    "product.added": "Добавлено",
    "product.details": "Описание",
    "product.composition": "Состав и уход",
    "product.shipping": "Доставка и возврат",
    "product.shipping.text":
      "СНГ — СДЭК, 2–7 дней. Остальной мир — 7–14 дней. На возврат — 14 дней.",
    "product.video.soon": "Видео с моделью скоро появится",
    "product.video.play": "Смотреть видео",
    "product.also": "Может подойти",

    // Cart
    "cart.title": "Корзина",
    "cart.empty": "Корзина пуста",
    "cart.empty.note": "Начните с витрины — там всё главное.",
    "cart.empty.cta": "На витрину",
    "cart.qty": "Кол-во",
    "cart.remove": "Убрать",
    "cart.subtotal": "Итого",
    "cart.note": "Доставка и оплата — на следующем шаге",
    "cart.checkout": "Оформить заказ",
    "cart.continue": "Продолжить покупки",

    // Checkout
    "checkout.title": "Оформление",
    "checkout.step.contact": "Контакты",
    "checkout.step.delivery": "Доставка",
    "checkout.step.payment": "Оплата",
    "checkout.name": "Имя и фамилия",
    "checkout.email": "Эл. почта",
    "checkout.phone": "Телефон",
    "checkout.region.title": "Регион доставки",
    "checkout.region.cis": "СНГ",
    "checkout.region.cis.note": "СДЭК — до пункта выдачи или курьером, 2–7 дней",
    "checkout.region.intl": "Международная",
    "checkout.region.intl.note": "Доставка 7–14 дней",
    "checkout.city": "Город",
    "checkout.address": "Адрес / пункт выдачи",
    "checkout.payment.title": "Способ оплаты",
    "checkout.payment.robokassa": "Robokassa",
    "checkout.payment.robokassa.note": "Карты РФ, СБП, кошельки",
    "checkout.pay": "Перейти к оплате",
    "checkout.summary": "Ваш заказ",
    "checkout.delivery.free": "Доставку посчитаем на шаге оплаты",
    "checkout.done.title": "Заказ принят",
    "checkout.done.text":
      "Спасибо. Подтверждение и детали доставки придут на почту.",
    "checkout.done.back": "Вернуться на главную",
    "checkout.fail.title": "Оплата не прошла",
    "checkout.fail.text":
      "Деньги не списаны. Попробуйте ещё раз или выберите другой способ оплаты.",
    "checkout.fail.retry": "Вернуться к оформлению",

    // Order tracking
    "order.title": "Заказ",
    "order.status.new": "Принят",
    "order.status.new.note": "Заказ оформлен и ждёт оплаты",
    "order.status.paid": "Оплачен",
    "order.status.paid.note": "Собираем заказ",
    "order.status.shipped": "Передан в доставку",
    "order.status.shipped.note": "Заказ в пути",
    "order.status.delivered": "Доставлен",
    "order.status.delivered.note": "Заказ у вас",
    "order.status.cancelled": "Отменён",
    "order.status.cancelled.note": "Заказ отменён — напишите нам, если это ошибка",
    "order.track.label": "Трек-номер СДЭК",
    "order.track.follow": "Отследить посылку",
    "order.items": "Состав заказа",
    "order.total": "Итого",
    "order.notfound": "Заказ не найден",
    "order.notfound.note": "Проверьте ссылку или найдите заказ по номеру и почте.",
    "order.track.cta": "Отследить заказ",
    "order.lookup.title": "Найти заказ",
    "order.code.label": "Код отслеживания",
    "order.code.lead": "Вставьте код отслеживания с экрана заказа.",
    "order.lookup.or": "Или по номеру заказа и почте",
    "order.lookup.lead": "Введите номер заказа и почту, на которую он оформлен.",
    "order.lookup.number": "Номер заказа",
    "order.lookup.cta": "Найти",
    "order.lookup.error": "Заказ с таким номером и почтой не нашёлся",

    // Forms
    "form.required": "Заполните поле",
    "form.email": "Проверьте адрес почты",
    "form.phone": "Проверьте номер телефона",

    // Partners
    "partners.label": "Сотрудничество",
    "partners.title": "Партнёрская программа",
    "partners.lead":
      "Оставьте заявку — после одобрения пришлём личную ссылку. С каждой оплаченной продажи по ней — 25%, всё считается автоматически.",
    "partners.how": "Как это устроено",
    "partners.step1.title": "Заявка",
    "partners.step1.text":
      "Оставьте имя и почту. Рассмотрим заявку и пришлём личную ссылку.",
    "partners.step2.title": "Продажи",
    "partners.step2.text":
      "Каждый переход и заказ по ссылке система записывает сама.",
    "partners.step3.title": "Выплата",
    "partners.step3.text":
      "25% с каждой продажи. Выплата раз в неделю, без ручных отчётов.",
    "partners.form.title": "Оставить заявку",
    "partners.form.name": "Ваше имя",
    "partners.form.email": "Эл. почта",
    "partners.form.cta": "Отправить заявку",
    "partners.form.done": "Заявка отправлена",
    "partners.form.sent": "Мы рассмотрим её и пришлём личную ссылку на",
    "partners.stats.title": "Кабинет партнёра",
    "partners.stats.clicks": "Переходы",
    "partners.stats.orders": "Заказы",
    "partners.stats.earned": "Начислено",
    "partners.share": "Ваша доля",

    // Footer
    "footer.tagline": "Уход и одежда в тихих тонах",
    "footer.shop": "Магазин",
    "footer.info": "Информация",
    "footer.about": "О бренде",
    "footer.delivery": "Доставка и оплата",
    "footer.returns": "Возврат",
    "footer.contacts": "Контакты",
    "footer.social": "Соцсети",
    "footer.rights": "Все права защищены",

    // Misc
    "lang.switch": "EN",
    "currency": "₽",
  },
  en: {
    "nav.visual": "Visual — clothing",
    "nav.forma": "Forma — skincare",
    "nav.partners": "Partners",
    "nav.cart": "Cart",
    "nav.menu": "Menu",
    "nav.close": "Close",

    "hero.house": "Two houses — one form",
    "hero.forma.tag": "Skincare",
    "hero.forma.title": "Forma",
    "hero.forma.line": "Clean formulas. Nothing your skin doesn't need.",
    "hero.forma.cta": "Shop skincare",
    "hero.visual.tag": "Clothing",
    "hero.visual.title": "Visual",
    "hero.visual.line": "Pieces in quiet tones — denim, merlot, chrome.",
    "hero.visual.cta": "Shop clothing",

    "home.manifesto":
      "Form is what remains when the excess is gone. We make skincare and clothing that never raise their voice.",
    "home.featured.label": "Featured",
    "home.featured.title": "This season",
    "home.featured.all": "Full catalogue",
    "home.forma.label": "Forma · Skincare",
    "home.forma.title": "A formula, nothing extra",
    "home.forma.text":
      "Vitamin C complex, tranexamic acid, panthenol. Hydrates, evens tone, softens.",
    "home.forma.cta": "To skincare",
    "home.visual.label": "Visual · Clothing",
    "home.visual.title": "A quiet form",
    "home.visual.text":
      "Washed denim, deep merlot, silver hardware. Pieces made to be worn for years.",
    "home.visual.cta": "To clothing",
    "home.partners.label": "Partnership",
    "home.partners.title": "25% of every sale",
    "home.partners.text":
      "Your personal link creates itself. Share it — and a quarter of every payment stays with you.",
    "home.partners.cta": "Become a partner",
    "home.note":
      "Shipping across CIS and worldwide · 14-day returns · Card or SBP payment",

    "catalog.visual.title": "Visual",
    "catalog.visual.sub": "Clothing & accessories",
    "catalog.forma.title": "Forma",
    "catalog.forma.sub": "Skincare",
    "catalog.items.one": "item",
    "catalog.items.few": "items",
    "catalog.items.many": "items",
    "catalog.soon": "Soon",
    "catalog.soon.note": "Formula still in progress",

    "product.back": "Back to catalogue",
    "product.size": "Size",
    "product.size.one": "One size",
    "product.volume": "Volume",
    "product.add": "Add to cart",
    "product.added": "Added",
    "product.details": "Description",
    "product.composition": "Composition & care",
    "product.shipping": "Shipping & returns",
    "product.shipping.text":
      "CIS — CDEK, 2–7 days. Worldwide — 7–14 days. Returns within 14 days.",
    "product.video.soon": "Model video coming soon",
    "product.video.play": "Play video",
    "product.also": "You may also like",

    "cart.title": "Cart",
    "cart.empty": "Your cart is empty",
    "cart.empty.note": "Start with the storefront — everything lives there.",
    "cart.empty.cta": "To the storefront",
    "cart.qty": "Qty",
    "cart.remove": "Remove",
    "cart.subtotal": "Subtotal",
    "cart.note": "Shipping and payment come next",
    "cart.checkout": "Checkout",
    "cart.continue": "Continue shopping",

    "checkout.title": "Checkout",
    "checkout.step.contact": "Contact",
    "checkout.step.delivery": "Delivery",
    "checkout.step.payment": "Payment",
    "checkout.name": "Full name",
    "checkout.email": "Email",
    "checkout.phone": "Phone",
    "checkout.region.title": "Delivery region",
    "checkout.region.cis": "CIS",
    "checkout.region.cis.note": "CDEK — pickup point or courier, 2–7 days",
    "checkout.region.intl": "International",
    "checkout.region.intl.note": "Delivery in 7–14 days",
    "checkout.city": "City",
    "checkout.address": "Address / pickup point",
    "checkout.payment.title": "Payment method",
    "checkout.payment.robokassa": "Robokassa",
    "checkout.payment.robokassa.note": "RU cards, SBP, wallets",
    "checkout.pay": "Proceed to payment",
    "checkout.summary": "Your order",
    "checkout.delivery.free": "Shipping is added at the payment step",
    "checkout.done.title": "Order received",
    "checkout.done.text":
      "Thank you. A confirmation with delivery details is on its way to your email.",
    "checkout.done.back": "Back to home",
    "checkout.fail.title": "Payment failed",
    "checkout.fail.text":
      "Nothing was charged. Try again or pick another payment method.",
    "checkout.fail.retry": "Back to checkout",

    "order.title": "Order",
    "order.status.new": "Received",
    "order.status.new.note": "The order is placed and awaits payment",
    "order.status.paid": "Paid",
    "order.status.paid.note": "We are assembling your order",
    "order.status.shipped": "Shipped",
    "order.status.shipped.note": "The order is on its way",
    "order.status.delivered": "Delivered",
    "order.status.delivered.note": "The order is with you",
    "order.status.cancelled": "Cancelled",
    "order.status.cancelled.note": "The order was cancelled — write to us if this is a mistake",
    "order.track.label": "CDEK tracking number",
    "order.track.follow": "Track the parcel",
    "order.items": "Order items",
    "order.total": "Total",
    "order.notfound": "Order not found",
    "order.notfound.note": "Check the link or find the order by number and email.",
    "order.track.cta": "Track order",
    "order.lookup.title": "Find your order",
    "order.code.label": "Tracking code",
    "order.code.lead": "Paste the tracking code from your order screen.",
    "order.lookup.or": "Or by order number and email",
    "order.lookup.lead": "Enter the order number and the email it was placed with.",
    "order.lookup.number": "Order number",
    "order.lookup.cta": "Find",
    "order.lookup.error": "No order with this number and email",

    "form.required": "Please fill this in",
    "form.email": "Check the email address",
    "form.phone": "Check the phone number",

    "partners.label": "Partnership",
    "partners.title": "Partner program",
    "partners.lead":
      "Apply once — we review and send your personal link. Every paid sale through it earns you 25%, counted automatically.",
    "partners.how": "How it works",
    "partners.step1.title": "Apply",
    "partners.step1.text":
      "Leave a name and an email. We review the application and send your link.",
    "partners.step2.title": "Sales",
    "partners.step2.text":
      "Every visit and order through your link is tracked for you.",
    "partners.step3.title": "Payout",
    "partners.step3.text":
      "25% of every sale. Paid out weekly, no manual reports.",
    "partners.form.title": "Apply now",
    "partners.form.name": "Your name",
    "partners.form.email": "Email",
    "partners.form.cta": "Send application",
    "partners.form.done": "Application sent",
    "partners.form.sent": "We will review it and send your personal link to",
    "partners.stats.title": "Partner cabinet",
    "partners.stats.clicks": "Clicks",
    "partners.stats.orders": "Orders",
    "partners.stats.earned": "Earned",
    "partners.share": "Your share",

    "footer.tagline": "Skincare and clothing in quiet tones",
    "footer.shop": "Shop",
    "footer.info": "Information",
    "footer.about": "About",
    "footer.delivery": "Shipping & payment",
    "footer.returns": "Returns",
    "footer.contacts": "Contacts",
    "footer.social": "Social",
    "footer.rights": "All rights reserved",

    "lang.switch": "RU",
    "currency": "$",
  },
} as const;

export type DictKey = keyof (typeof dictionaries)["ru"];

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    /* An explicit choice made with the switcher always wins; otherwise
       detect from the browser: any Russian in the language list → RU
       (covers CIS setups like kk-KZ + ru-RU), everything else → EN. */
    const saved = window.localStorage.getItem("fv-lang");
    if (saved === "ru" || saved === "en") {
      setLangState(saved);
      return;
    }
    const langs =
      navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];
    const wantsRu = langs.some((l) => l?.toLowerCase().startsWith("ru"));
    setLangState(wantsRu ? "ru" : "en");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem("fv-lang", lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback(
    (key: DictKey) => dictionaries[lang][key] ?? dictionaries.ru[key],
    [lang],
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}

/* Price formatting: RUB for RU, USD for EN */
export function formatPrice(lang: Lang, priceRub: number, priceUsd: number) {
  if (lang === "ru") {
    return `${priceRub.toLocaleString("ru-RU").replace(/ /g, " ")} ₽`;
  }
  return `$${priceUsd.toLocaleString("en-US")}`;
}

/* Russian plural helper for item counts */
export function plural(
  lang: Lang,
  n: number,
  forms: { one: string; few: string; many: string },
) {
  if (lang === "en") return n === 1 ? forms.one : forms.many;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms.one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few;
  return forms.many;
}
