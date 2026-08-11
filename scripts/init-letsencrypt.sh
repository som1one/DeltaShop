#!/bin/sh
# Первый выпуск сертификата Let's Encrypt для forma-visual.com.
#
# Запускать ОДИН раз на сервере из корня репозитория:
#   CERTBOT_EMAIL=you@example.com sh scripts/init-letsencrypt.sh
#
# Продление дальше автоматическое — сервис certbot в docker-compose.yml
# проверяет срок дважды в сутки, nginx перечитывает конфиг каждые 6 часов.
#
# ВНИМАНИЕ: скрипт передаёт certbot флаг --agree-tos, то есть запуская его
# вы принимаете условия Let's Encrypt (https://letsencrypt.org/repository/).
set -eu

# .env читает docker compose, но не оболочка — подхватим сами
if [ -f .env ]; then
  . ./.env
fi

DOMAIN="${DOMAIN:-forma-visual.com}"
WWW="www.$DOMAIN"
EMAIL="${CERTBOT_EMAIL:-}"
STAGING="${STAGING:-0}"   # STAGING=1 — тестовый CA Let's Encrypt, без лимитов

if [ -z "$EMAIL" ]; then
  echo "CERTBOT_EMAIL не задан (нужен для писем об истечении сертификата)." >&2
  echo "Запустите так:  CERTBOT_EMAIL=you@example.com sh scripts/init-letsencrypt.sh" >&2
  exit 1
fi

staging_arg=""
[ "$STAGING" = "1" ] && staging_arg="--staging"

certbot_run() {
  docker compose run --rm --entrypoint "$1" certbot
}

on_failure() {
  echo >&2
  echo "─── Выпуск не завершён ───────────────────────────────────────" >&2
  echo "Сейчас nginx отдаёт HTTPS с самоподписанным сертификатом, а HTTP" >&2
  echo "редиректит на HTTPS — браузер будет ругаться на сертификат." >&2
  echo "Что делать:" >&2
  echo "  • посмотреть причину:  docker compose logs --tail=50 nginx" >&2
  echo "  • проверить, что домен смотрит на этот сервер:  curl -I http://$DOMAIN/" >&2
  echo "  • повторить выпуск:    CERTBOT_EMAIL=$EMAIL sh scripts/init-letsencrypt.sh" >&2
  echo "  • откатиться на HTTP:  git checkout HEAD~1 -- nginx docker-compose.yml && docker compose up -d" >&2
}

# ── 0. Уже выпущен? Тогда просто поднимаем всё и выходим ──
if certbot_run "sh -c '[ -s /etc/letsencrypt/renewal/$DOMAIN.conf ]'" >/dev/null 2>&1; then
  echo "▸ сертификат для $DOMAIN уже есть — поднимаю сервисы и перечитываю nginx"
  docker compose up -d --build
  docker compose exec nginx nginx -s reload
  exit 0
fi

# ── 1. Порт 443 должен быть свободен от посторонних слушателей ──
if ! docker compose ps --status running --services 2>/dev/null | grep -qx nginx; then
  if command -v ss >/dev/null 2>&1 &&
     ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE '[.:]443$'; then
    echo "Порт 443 занят другим процессом — docker не сможет его открыть:" >&2
    ss -ltnp 2>/dev/null | grep -E '[.:]443[[:space:]]' >&2 || true
    echo "Остановите его (системный nginx/apache/traefik) и повторите." >&2
    exit 1
  fi
fi

trap on_failure EXIT INT TERM

# ── 2. Временный self-signed: без файлов сертификата nginx не стартует ──
echo "▸ 1/6  временный самоподписанный сертификат"
certbot_run "sh -c 'mkdir -p /etc/letsencrypt/live/$DOMAIN && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out    /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj   /CN=localhost'"

# ── 3. Синтаксис конфига — до того, как ронять работающий nginx ──
echo "▸ 2/6  проверка конфига nginx"
docker compose run --rm --no-deps --entrypoint sh nginx -c 'nginx -t'

# ── 4. Поднимаем стек ──
echo "▸ 3/6  сборка и запуск контейнеров"
docker compose up -d --build

echo "▸ 4/6  жду, пока nginx ответит на :80"
i=0
while [ "$i" -lt 30 ]; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1/" 2>/dev/null || echo 000)
  case "$code" in
    000) ;;
    *) break ;;
  esac
  i=$((i + 1))
  sleep 2
done

# ── 5. Убираем заглушку и просим настоящий сертификат ──
echo "▸ 5/6  запрашиваю сертификат на $DOMAIN и $WWW"
certbot_run "rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"

certbot_run "certbot certonly --webroot -w /var/www/certbot \
  $staging_arg \
  --email $EMAIL \
  --agree-tos --no-eff-email \
  -d $DOMAIN -d $WWW"

# ── 6. Перечитываем конфиг — nginx подхватывает настоящие файлы ──
echo "▸ 6/6  перезагружаю nginx"
docker compose exec nginx nginx -s reload

trap - EXIT INT TERM
echo
echo "Готово. Проверьте: https://$DOMAIN"
