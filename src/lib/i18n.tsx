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
    "nav.account": "Кабинет",
    "nav.login": "Войти",

    // Hero
    "hero.house": "Два дома — одна форма",
    "hero.forma.tag": "Уход за кожей",
    "hero.forma.title": "Forma",
    "hero.forma.line": "Только то, что действительно нужно.",
    "hero.forma.cta": "Смотреть уход",
    "hero.visual.tag": "Одежда",
    "hero.visual.title": "Visual",
    "hero.visual.line": "Одежда со своим характером.",
    "hero.visual.cta": "Смотреть одежду",

    // Home sections
    "home.manifesto":
      "Форма — это то, что остаётся, когда убрано лишнее. Мы делаем уход и одежду, которым не нужно повышать голос.",
    "home.featured.label": "Избранное",
    "home.featured.title": "Витрина сезона",
    "home.featured.all": "Весь каталог",
    "home.forma.label": "Forma · Уход",
    "home.forma.title": "Чистая эффективность",
    "home.forma.text":
      "Глубокий уход, видимый результат и премиальные текстуры. Забота о себе на каждом этапе ежедневного ритуала.",
    "home.forma.cta": "К уходу",
    "home.visual.label": "Visual · Одежда",
    "home.visual.title": "Форма и содержание",
    "home.visual.text":
      "Архитектурный крой, надежные материалы и сдержанная палитра. Создано, чтобы служить годами.",
    "home.visual.cta": "К одежде",
    "home.partners.label": "Сотрудничество",
    "home.partners.title": "25% с каждой продажи",
    "home.partners.text":
      "Личная ссылка создаётся сама. Делитесь ею — и четверть каждой оплаты остаётся вам.",
    "home.partners.cta": "Стать партнёром",
    "home.note": "Доставка по СНГ и миру · Возврат в течение 14 дней",

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
    "checkout.auth.title": "Войдите, чтобы оформить заказ",
    "checkout.auth.note":
      "Заказ оформляется из учётной записи — так он остаётся в кабинете со статусом и трек-номером. Корзина сохранится.",
    "checkout.auth.cta": "Войти или зарегистрироваться",
    "checkout.account.email": "Почта учётной записи",
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
    "checkout.payment.provider": "ЮKassa",
    "checkout.payment.provider.note": "Карты, СБП, кошельки",
    "checkout.pay": "Перейти к оплате",
    "checkout.consent": "Нажимая „Перейти к оплате“, вы принимаете",
    "checkout.unavailable":
      "Приём оплаты сейчас не настроен — заказ не оформлен, деньги не списаны. Напишите нам, и мы примем заказ вручную.",
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
    "order.status.new": "Ждёт оплаты",
    "order.status.new.note": "Заказ оформлен и ждёт оплаты",
    "order.status.paid": "Оплачен",
    "order.status.paid.note": "Оплата получена",
    "order.status.accepted": "Принят",
    "order.status.accepted.note": "Заказ принят в работу, собираем",
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

    // Вход и регистрация
    "auth.title": "Учётная запись",
    "auth.tab.login": "Вход",
    "auth.tab.register": "Регистрация",
    "auth.lead.login": "Войдите, чтобы видеть свои заказы и оформлять новые.",
    "auth.lead.register":
      "Заказ оформляется из учётной записи — в ней видны статусы, трек-номера и данные доставки.",
    "auth.name": "Имя и фамилия",
    "auth.email": "Эл. почта",
    "auth.password": "Пароль",
    "auth.password.hint": "От 8 знаков",
    "auth.submit.login": "Войти",
    "auth.submit.register": "Создать учётную запись",
    "auth.sending": "Отправляем…",
    "auth.forgot":
      "Забыли пароль? Напишите нам с адреса учётной записи — выдадим новый.",
    "auth.error.bad_email": "Проверьте адрес почты",
    "auth.error.bad_name": "Заполните имя",
    "auth.error.weak_password": "Пароль — от 8 знаков",
    "auth.error.email_taken": "На эту почту уже есть учётная запись",
    "auth.error.bad_credentials": "Неверная почта или пароль",
    "auth.error.rate_limited": "Слишком много попыток. Попробуйте через 15 минут",
    "auth.error.server": "Что-то пошло не так. Попробуйте ещё раз",

    // Кабинет
    "account.title": "Кабинет",
    "account.logout": "Выйти",
    "account.tab.orders": "Заказы",
    "account.tab.profile": "Профиль",
    "account.tab.partner": "Партнёрство",
    "account.orders.empty": "Заказов пока нет",
    "account.orders.empty.note":
      "Всё, что закажете, появится здесь — со статусом, трек-номером и составом.",
    "account.orders.cta": "На витрину",
    "account.orders.open": "Открыть заказ",
    "account.orders.pay": "Оплатить",
    "account.orders.paying": "Открываем оплату…",
    "account.orders.payfailed": "Оплата сейчас недоступна. Попробуйте позже.",
    "account.orders.items": "позиции в заказе",
    "account.profile.title": "Данные доставки",
    "account.profile.note": "Подставляются при оформлении заказа.",
    "account.profile.save": "Сохранить",
    "account.profile.saved": "Сохранено",
    "account.profile.failed": "Не удалось сохранить",
    "account.password.title": "Пароль",
    "account.password.current": "Текущий пароль",
    "account.password.next": "Новый пароль",
    "account.password.save": "Сменить пароль",
    "account.password.saved": "Пароль обновлён",
    "account.password.wrong": "Текущий пароль не подошёл",
    "account.partner.lead":
      "Вы получаете 25% с каждого оплаченного заказа, который пришёл по вашей ссылке.",
    "account.partner.how": "Как это работает",
    "account.partner.how1":
      "Заявка. Вы подаёте её здесь, мы отвечаем в этом же разделе — писем сайт не отправляет.",
    "account.partner.how2":
      "Ссылка. После одобрения она появится здесь. Отправляйте её кому угодно — в канал, в сторис, другу.",
    "account.partner.how3":
      "Деньги. Кто-то перешёл по ссылке и оплатил заказ — 25% от него появляются здесь и уходят на выплату.",
    "account.partner.tax":
      "Вознаграждение переводим самозанятым и ИП. Реквизиты попросим позже — когда появится первое начисление.",
    "account.partner.rules.accept": "Я прочитал правила программы",
    "account.partner.rules.link": "Правила программы",
    "account.partner.rules.required": "Отметьте, что прочитали правила",
    "account.partner.apply": "Подать заявку",
    "account.partner.join": "Стать партнёром",
    "account.partner.motivation": "Почему мы должны выбрать вас",
    "account.partner.motivation.hint":
      "Пара строк о себе: где расскажете о нас и кто вас читает. Можно не заполнять.",
    "account.partner.status.new": "Заявка на рассмотрении",
    "account.partner.status.new.note":
      "Решение появится в этом разделе. Писем сайт не отправляет, поэтому загляните сюда через день-другой.",
    "account.partner.status.approved": "Заявка одобрена",
    "account.partner.status.rejected": "Заявка отклонена",
    "account.partner.status.rejected.note":
      "Напишите нам, если считаете это ошибкой.",
    "account.partner.status.stopped": "Участие в программе остановлено",
    "account.partner.status.stopped.note":
      "Ссылка больше не работает, новые заказы по ней не засчитываются. Заработанное остаётся вашим — оно ниже, и мы его выплатим.",
    "account.partner.status": "Статус",
    "account.partner.code": "Код",
    "account.partner.link": "Ваша ссылка",
    "account.partner.copy": "Скопировать",
    "account.partner.copied": "Скопировано",
    "account.partner.link.hint":
      "Отправляйте её кому угодно. Кто перейдёт по ней и оплатит заказ в течение 30 дней — засчитается вам.",
    "account.partner.link.where": "Куда ведёт",
    "account.partner.link.home": "На главную",
    "account.partner.code.hint":
      "он стоит в конце ссылки, по нему мы и узнаём, что покупатель пришёл от вас.",
    "account.partner.stats.clicks": "Переходы за 30 дней",
    "account.partner.stats.orders": "Заказы",
    "account.partner.stats.accrued": "Начислено всего",
    "account.partner.stats.hold": "На проверке",
    "account.partner.stats.payable": "К выплате",
    "account.partner.stats.paid": "Выплачено",
    "account.partner.orders.title": "Заказы по вашей ссылке",
    "account.partner.orders.empty":
      "По ссылке ещё никто не покупал. Как только это случится, заказ появится здесь — с датой, суммой и вашими 25%.",
    "account.partner.orders.yours": "Ваши",
    "account.partner.state.hold": "На проверке до",
    "account.partner.state.payable": "К выплате",
    "account.partner.state.paid": "Выплачено",
    "account.partner.state.review": "Проверяем вручную",
    "account.partner.state.self": "Не засчитан: ваш собственный заказ",
    "account.partner.state.cancelled": "Не засчитан: заказ отменён",
    "account.partner.state.admin": "Снято администратором",
    "account.partner.payout.title": "Куда платить",
    "account.partner.payout.note":
      "Переводим по СБП на телефон или на расчётный счёт. Номера банковских карт не принимаем.",
    "account.partner.payout.method": "Способ",
    "account.partner.payout.sbp": "СБП по номеру телефона",
    "account.partner.payout.account": "Расчётный счёт",
    "account.partner.payout.phone": "Телефон",
    "account.partner.payout.number": "Номер счёта",
    "account.partner.payout.name": "Получатель",
    "account.partner.payout.save": "Сохранить реквизиты",
    "account.partner.payout.saved": "Реквизиты сохранены",
    "account.partner.payout.error.bad_name": "Укажите получателя",
    "account.partner.payout.error.bad_phone": "Проверьте номер телефона",
    "account.partner.payout.error.bad_account": "В номере счёта 20 цифр",
    "account.partner.payouts.title": "Выплаты",
    "account.partner.payouts.empty": "Выплат пока не было.",
    "account.partner.payouts.cancelled": "отменена",
    "account.partner.payouts.receipt": "чек получен",

    // Partners
    "partners.label": "Сотрудничество",
    "partners.title": "Партнёрская программа",
    "partners.lead":
      "Подайте заявку из кабинета — после одобрения там же появится личная ссылка. С каждого оплаченного заказа по ней вам идёт 25%: заказы и начисления кабинет считает сам, перевод делаем руками.",
    "partners.how": "Как это устроено",
    "partners.step1.title": "Заявка",
    "partners.step1.text":
      "Заведите учётную запись и подайте заявку из кабинета — одной кнопкой.",
    "partners.step2.title": "Продажи",
    "partners.step2.text":
      "Каждый переход и заказ по ссылке система записывает сама.",
    "partners.step3.title": "Выплата",
    "partners.step3.text":
      "25% с каждого заказа. Начисление видно сразу, к выплате оно готово после срока возврата.",
    "partners.form.title": "Оставить заявку",
    "partners.cta.lead.guest":
      "Заявка подаётся из кабинета: войдите или заведите учётную запись — статус и личная ссылка будут там же.",
    "partners.cta.lead.user":
      "Заявка подаётся из кабинета — имя и почта уже в вашей учётной записи.",
    "partners.cta.login": "Войти или зарегистрироваться",
    "partners.cta.account": "Перейти в кабинет",
    "partners.stats.title": "Кабинет партнёра",
    "partners.stats.clicks": "Переходы",
    "partners.stats.orders": "Заказы",
    "partners.stats.earned": "Начислено",
    "partners.share": "Ваша доля",

    // Условия программы — вместо выдуманной статистики
    "partners.terms.title": "Условия без мелкого шрифта",
    "partners.terms.rate.k": "Ставка",
    "partners.terms.rate.v": "25% от суммы оплаченного заказа",
    "partners.terms.what.k": "Что засчитывается",
    "partners.terms.what.v": "Заказ, оплаченный после перехода по вашей ссылке",
    "partners.terms.window.k": "Срок метки",
    "partners.terms.window.v": "30 дней с перехода",
    "partners.terms.hold.k": "Проверка",
    "partners.terms.hold.v": "14 дней после доставки — на случай возврата",
    "partners.terms.payout.k": "Выплата",
    "partners.terms.payout.v": "СБП или счёт, после подтверждения начислений",
    "partners.terms.who.k": "Кому платим",
    "partners.terms.who.v": "Самозанятым и ИП",
    "partners.terms.clicks.k": "Переходы",
    "partners.terms.clicks.v": "Показываем в кабинете, но не оплачиваем",
    "partners.terms.self.k": "Свои заказы",
    "partners.terms.self.v": "С вашей учётной записи и почты — не засчитываются",
    "partners.calc.title": "Сколько это в деньгах",
    "partners.calc.order": "Заказ на",
    "partners.calc.you": "Вам",
    "partners.calc.note": "Это расчёт по ставке 25%, а не чья-то статистика.",
    "partners.mine.title": "Ваш кабинет",
    "partners.mine.cta": "Открыть кабинет",
    "partners.rules": "Правила программы",

    // Footer
    "footer.tagline": "Два дома — одна концепция ухода и стиля",
    "footer.shop": "Магазин",
    "footer.info": "Информация",
    "footer.about": "О бренде",
    "footer.delivery": "Доставка и оплата",
    "footer.returns": "Возврат",
    "footer.contacts": "Контакты",
    "footer.social": "Соцсети",
    "footer.legal": "Документы",
    "footer.privacy": "Политика конфиденциальности",
    "footer.offer": "Публичная оферта",
    "footer.requisites": "Реквизиты",
    "footer.rights": "Все права защищены",

    // Legal — короткие формы для строки согласия
    "legal.offer.short": "оферту",
    "legal.privacy.short": "политику конфиденциальности",
    "legal.and": "и",

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
    "nav.account": "Account",
    "nav.login": "Log in",

    "hero.house": "Two houses — one form",
    "hero.forma.tag": "Skincare",
    "hero.forma.title": "Forma",
    "hero.forma.line": "Only what you truly need.",
    "hero.forma.cta": "Shop skincare",
    "hero.visual.tag": "Clothing",
    "hero.visual.title": "Visual",
    "hero.visual.line": "Clothing with its own character.",
    "hero.visual.cta": "Shop clothing",

    "home.manifesto":
      "Form is what remains when the excess is gone. We make skincare and clothing that never raise their voice.",
    "home.featured.label": "Featured",
    "home.featured.title": "This season",
    "home.featured.all": "Full catalogue",
    "home.forma.label": "Forma · Skincare",
    "home.forma.title": "Pure Efficiency",
    "home.forma.text":
      "Deep care, visible results, and premium textures. Self-care at every stage of your daily ritual.",
    "home.forma.cta": "To skincare",
    "home.visual.label": "Visual · Clothing",
    "home.visual.title": "Form and Substance",
    "home.visual.text":
      "Architectural cuts, durable fabrics, and a restrained palette. Made to last for years.",
    "home.visual.cta": "To clothing",
    "home.partners.label": "Partnership",
    "home.partners.title": "25% of every sale",
    "home.partners.text":
      "Your personal link creates itself. Share it — and a quarter of every payment stays with you.",
    "home.partners.cta": "Become a partner",
    "home.note": "Shipping across CIS and worldwide · 14-day returns",

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
    "checkout.auth.title": "Log in to place the order",
    "checkout.auth.note":
      "Orders are placed from an account — that is how it stays in your cabinet with status and tracking. Your cart is kept.",
    "checkout.auth.cta": "Log in or register",
    "checkout.account.email": "Account email",
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
    "checkout.payment.provider": "YooKassa",
    "checkout.payment.provider.note": "Cards, SBP, wallets",
    "checkout.pay": "Proceed to payment",
    "checkout.consent": "By pressing “Proceed to payment” you accept",
    "checkout.unavailable":
      "Payment is not set up right now — the order was not placed and nothing was charged. Write to us and we will take it by hand.",
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
    "order.status.new": "Awaiting payment",
    "order.status.new.note": "The order is placed and awaits payment",
    "order.status.paid": "Paid",
    "order.status.paid.note": "Payment received",
    "order.status.accepted": "Accepted",
    "order.status.accepted.note": "Accepted into work — we are assembling it",
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

    "auth.title": "Account",
    "auth.tab.login": "Log in",
    "auth.tab.register": "Register",
    "auth.lead.login": "Log in to see your orders and place new ones.",
    "auth.lead.register":
      "Orders are placed from an account — it keeps statuses, tracking numbers and delivery details in one place.",
    "auth.name": "Full name",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.password.hint": "8 characters or more",
    "auth.submit.login": "Log in",
    "auth.submit.register": "Create account",
    "auth.sending": "Sending…",
    "auth.forgot":
      "Forgot your password? Write to us from the account address and we will issue a new one.",
    "auth.error.bad_email": "Check the email address",
    "auth.error.bad_name": "Please fill in your name",
    "auth.error.weak_password": "Password — 8 characters or more",
    "auth.error.email_taken": "An account with this email already exists",
    "auth.error.bad_credentials": "Wrong email or password",
    "auth.error.rate_limited": "Too many attempts. Try again in 15 minutes",
    "auth.error.server": "Something went wrong. Please try again",

    "account.title": "Account",
    "account.logout": "Log out",
    "account.tab.orders": "Orders",
    "account.tab.profile": "Profile",
    "account.tab.partner": "Partnership",
    "account.orders.empty": "No orders yet",
    "account.orders.empty.note":
      "Everything you order shows up here — status, tracking number and contents.",
    "account.orders.cta": "To the storefront",
    "account.orders.open": "Open order",
    "account.orders.pay": "Pay",
    "account.orders.paying": "Opening payment…",
    "account.orders.payfailed": "Payment is unavailable right now. Try later.",
    "account.orders.items": "items in the order",
    "account.profile.title": "Delivery details",
    "account.profile.note": "Prefilled at checkout.",
    "account.profile.save": "Save",
    "account.profile.saved": "Saved",
    "account.profile.failed": "Could not save",
    "account.password.title": "Password",
    "account.password.current": "Current password",
    "account.password.next": "New password",
    "account.password.save": "Change password",
    "account.password.saved": "Password updated",
    "account.password.wrong": "The current password does not match",
    "account.partner.lead":
      "You earn 25% of every paid order that arrives through your link.",
    "account.partner.how": "How it works",
    "account.partner.how1":
      "Apply. You do it here and we answer in this very section — the site sends no email.",
    "account.partner.how2":
      "Your link. It appears here once approved. Send it to anyone — a channel, a story, a friend.",
    "account.partner.how3":
      "Money. Someone follows the link and pays for an order — 25% of it shows up here and goes to payout.",
    "account.partner.tax":
      "We pay self-employed persons and sole proprietors. Payout details are asked later — when the first commission appears.",
    "account.partner.rules.accept": "I have read the programme rules",
    "account.partner.rules.link": "Programme rules",
    "account.partner.rules.required": "Please confirm you read the rules",
    "account.partner.apply": "Apply",
    "account.partner.join": "Become a partner",
    "account.partner.motivation": "Why should we pick you",
    "account.partner.motivation.hint":
      "A couple of lines about yourself: where you will mention us and who reads you. Optional.",
    "account.partner.status.new": "Application under review",
    "account.partner.status.new.note":
      "The decision appears in this section. The site sends no email, so look back in a day or two.",
    "account.partner.status.approved": "Application approved",
    "account.partner.status.rejected": "Application declined",
    "account.partner.status.rejected.note":
      "Write to us if you think this is a mistake.",
    "account.partner.status.stopped": "Participation has been stopped",
    "account.partner.status.stopped.note":
      "The link no longer works and new orders through it do not count. What you earned stays yours — it is listed below and we will pay it out.",
    "account.partner.status": "Status",
    "account.partner.code": "Code",
    "account.partner.link": "Your link",
    "account.partner.copy": "Copy",
    "account.partner.copied": "Copied",
    "account.partner.link.hint":
      "Send it to anyone. Whoever follows it and pays for an order within 30 days counts as yours.",
    "account.partner.link.where": "Leads to",
    "account.partner.link.home": "Home page",
    "account.partner.code.hint":
      "it sits at the end of the link, and that is how we know the buyer came from you.",
    "account.partner.stats.clicks": "Visits in 30 days",
    "account.partner.stats.orders": "Orders",
    "account.partner.stats.accrued": "Earned in total",
    "account.partner.stats.hold": "On hold",
    "account.partner.stats.payable": "Ready to pay",
    "account.partner.stats.paid": "Paid out",
    "account.partner.orders.title": "Orders through your link",
    "account.partner.orders.empty":
      "Nobody has bought through the link yet. When they do, the order shows up here — date, amount and your 25%.",
    "account.partner.orders.yours": "Yours",
    "account.partner.state.hold": "On hold until",
    "account.partner.state.payable": "Ready to pay",
    "account.partner.state.paid": "Paid out",
    "account.partner.state.review": "Checking by hand",
    "account.partner.state.self": "Not counted: your own order",
    "account.partner.state.cancelled": "Not counted: the order was cancelled",
    "account.partner.state.admin": "Removed by the administrator",
    "account.partner.payout.title": "Where to pay",
    "account.partner.payout.note":
      "We transfer via SBP to a phone number or to a bank account. We never take card numbers.",
    "account.partner.payout.method": "Method",
    "account.partner.payout.sbp": "SBP by phone number",
    "account.partner.payout.account": "Bank account",
    "account.partner.payout.phone": "Phone",
    "account.partner.payout.number": "Account number",
    "account.partner.payout.name": "Recipient",
    "account.partner.payout.save": "Save details",
    "account.partner.payout.saved": "Details saved",
    "account.partner.payout.error.bad_name": "Please name the recipient",
    "account.partner.payout.error.bad_phone": "Check the phone number",
    "account.partner.payout.error.bad_account": "An account number has 20 digits",
    "account.partner.payouts.title": "Payouts",
    "account.partner.payouts.empty": "No payouts yet.",
    "account.partner.payouts.cancelled": "cancelled",
    "account.partner.payouts.receipt": "receipt received",

    "partners.label": "Partnership",
    "partners.title": "Partner program",
    "partners.lead":
      "Apply from your account — once approved, your personal link appears there. Every paid order through it earns you 25%: the cabinet counts orders and commissions itself, the transfer we make by hand.",
    "partners.how": "How it works",
    "partners.step1.title": "Apply",
    "partners.step1.text":
      "Create an account and apply from your cabinet — one button.",
    "partners.step2.title": "Sales",
    "partners.step2.text":
      "Every visit and order through your link is tracked for you.",
    "partners.step3.title": "Payout",
    "partners.step3.text":
      "25% of every order. The commission shows up at once and is ready to pay after the return window.",
    "partners.form.title": "Apply now",
    "partners.cta.lead.guest":
      "Applications come from your account: log in or create one — the status and your personal link live there.",
    "partners.cta.lead.user":
      "Applications come from your account — your name and email are already there.",
    "partners.cta.login": "Log in or register",
    "partners.cta.account": "Open the account",
    "partners.stats.title": "Partner cabinet",
    "partners.stats.clicks": "Visits",
    "partners.stats.orders": "Orders",
    "partners.stats.earned": "Earned",
    "partners.share": "Your share",

    "partners.terms.title": "The terms, no small print",
    "partners.terms.rate.k": "Rate",
    "partners.terms.rate.v": "25% of the paid order total",
    "partners.terms.what.k": "What counts",
    "partners.terms.what.v": "An order paid after someone followed your link",
    "partners.terms.window.k": "Attribution window",
    "partners.terms.window.v": "30 days from the visit",
    "partners.terms.hold.k": "Hold",
    "partners.terms.hold.v": "14 days after delivery — in case of a return",
    "partners.terms.payout.k": "Payout",
    "partners.terms.payout.v": "SBP or bank account, once commissions are confirmed",
    "partners.terms.who.k": "Who we pay",
    "partners.terms.who.v": "Self-employed persons and sole proprietors",
    "partners.terms.clicks.k": "Visits",
    "partners.terms.clicks.v": "Shown in your cabinet, never paid for",
    "partners.terms.self.k": "Your own orders",
    "partners.terms.self.v": "From your account or email — never count",
    "partners.calc.title": "What that is in money",
    "partners.calc.order": "An order of",
    "partners.calc.you": "You get",
    "partners.calc.note": "This is a calculation at 25%, not anyone's statistics.",
    "partners.mine.title": "Your cabinet",
    "partners.mine.cta": "Open the cabinet",
    "partners.rules": "Programme rules",

    "footer.tagline": "Two houses — one concept of care and style",
    "footer.shop": "Shop",
    "footer.info": "Information",
    "footer.about": "About",
    "footer.delivery": "Shipping & payment",
    "footer.returns": "Returns",
    "footer.contacts": "Contacts",
    "footer.social": "Social",
    "footer.legal": "Legal",
    "footer.privacy": "Privacy policy",
    "footer.offer": "Public offer",
    "footer.requisites": "Company details",
    "footer.rights": "All rights reserved",

    "legal.offer.short": "the offer",
    "legal.privacy.short": "the privacy policy",
    "legal.and": "and",

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

/**
 * Партнёрское вознаграждение хранится в копейках и всегда в рублях:
 * программа рублёвая независимо от языка витрины. Дробная часть
 * показывается только когда она есть — 25% от 7 990 ₽ это 1 997,50 ₽.
 */
export function formatKop(lang: Lang, kop: number): string {
  const value = (kop / 100).toLocaleString(lang === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: kop % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${value.replace(/ /g, " ")} ₽`;
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
