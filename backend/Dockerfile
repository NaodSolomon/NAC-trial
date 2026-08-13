FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# ── Install dependencies ───────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ── Build ──────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Production dependencies only ─────────────────────────────
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# ── Production runner ──────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

COPY --from=prod-deps --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
# Keep migrations as an explicit runner-image contract instead of relying only
# on Nest CLI asset copying performed during compilation.
COPY --from=builder --chown=nestjs:nestjs /app/src/database/migrations ./dist/database/migrations
COPY --chown=nestjs:nestjs package.json ./

RUN test -f ./dist/database/migrations/meta/_journal.json && \
    test -n "$(find ./dist/database/migrations -maxdepth 1 -name '*.sql' -print -quit)"

USER nestjs
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8000/api/v1/system/health >/dev/null || exit 1
CMD ["dumb-init", "node", "dist/src/main.js"]
