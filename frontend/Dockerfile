FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# ── Install dependencies ───────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build ──────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are compiled into browser chunks. Production images must
# receive them at build time; runtime environment variables cannot rewrite them.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_STORAGE_ORIGIN
ARG NEXT_PUBLIC_MEDIA_HOSTS=""
ARG MEDIA_IMAGE_ORIGIN
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_STORAGE_ORIGIN=${NEXT_PUBLIC_STORAGE_ORIGIN} \
    NEXT_PUBLIC_MEDIA_HOSTS=${NEXT_PUBLIC_MEDIA_HOSTS} \
    MEDIA_IMAGE_ORIGIN=${MEDIA_IMAGE_ORIGIN} \
    API_URL=${NEXT_PUBLIC_API_URL}
RUN node scripts/validate-production-build-env.mjs && \
    pnpm build && \
    node scripts/check-production-client-artifact.mjs

# ── Production runner ──────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nextjs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Next.js standalone output includes only what's needed
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/scripts/check-production-client-artifact.mjs /app/scripts/check-production-image-runtime.mjs ./scripts/

USER nextjs
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
CMD ["dumb-init", "node", "server.js"]
