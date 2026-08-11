# ── Stage 1: install dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: build Next.js ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: production runner ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Точка монтирования тома с загруженными фото. Пустой named volume наследует
# владельца этого каталога, поэтому создаём его от nextjs — иначе том
# окажется root-only и запись из админки упадёт.
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads
ENV UPLOAD_DIR=/app/uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
