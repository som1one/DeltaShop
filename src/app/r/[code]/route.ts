import { NextResponse } from "next/server";
import {
  ATTRIBUTION_DAYS,
  recordClick,
  visitorHash,
} from "@/lib/partner-ledger";
import { findActiveByRefCode, normalizeRefCode, REF_COOKIE } from "@/lib/partners";

/**
 * Партнёрская ссылка — одна на всю программу: /r/КОД.
 *
 * Здесь и только здесь появляется метка партнёра: маршрут ставит куку на
 * 30 дней, засчитывает переход и уводит человека на страницу магазина.
 * Ни одна другая страница в базу по этому поводу не пишет.
 */

const SITE_PATHS = /^\/[^/\\:]*/;

/** Куда уводить: только внутрь сайта — иначе ссылка станет фишинговой. */
function safeTarget(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.includes(":") || raw.includes("\\")) return "/";
  return SITE_PATHS.test(raw) ? raw : "/";
}

/** Превью-загрузчики мессенджеров ходят по ссылке сами — это не переход. */
const BOT = /bot|crawl|spider|preview|facebookexternalhit|telegram|whatsapp|vkshare|slack|discord|skype|curl|wget|python-requests|headless/i;

/**
 * Уводим относительным адресом. Абсолютный собирать не из чего: за nginx
 * приложение видит собственный служебный хост (0.0.0.0:3000), и переход
 * по партнёрской ссылке уезжал именно туда. Относительный Location
 * браузер разрешает от самой ссылки — домен всегда верный.
 */
function goTo(target: string): NextResponse {
  return new NextResponse(null, { status: 302, headers: { Location: target } });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await params;
  const url = new URL(request.url);
  const target = safeTarget(url.searchParams.get("to"));
  const code = normalizeRefCode(raw ?? "");

  /* Код не тот — просто уводим на витрину, без намёка на то, существует
     ли такой партнёр. */
  if (!code) return goTo(target);

  const partner = await findActiveByRefCode(code);
  if (!partner) return goTo(target);

  const userAgent = request.headers.get("user-agent") ?? "";
  /* Ссылку могут вставить картинкой или в iframe на чужом сайте, чтобы
     собрать чужие продажи: метку ставим только настоящему переходу. */
  const dest = request.headers.get("sec-fetch-dest");
  const isDocument = dest === null || dest === "document";
  const isBot = BOT.test(userAgent);

  const response = goTo(target);
  if (!isDocument || isBot) return response;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";
  try {
    await recordClick(code, visitorHash(ip, new Date().toISOString().slice(0, 10)));
  } catch (e) {
    /* Счётчик переходов не стоит того, чтобы ломать переход человеку */
    console.error("Партнёрка: не удалось записать переход", e);
  }

  response.cookies.set(REF_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ATTRIBUTION_DAYS * 24 * 3600,
    path: "/",
  });
  return response;
}
