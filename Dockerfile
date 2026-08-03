# NextGen Planner — Next.js standalone (monorepo Turborepo)
# Build: env via BuildKit secret (ENV_FILE_WEB) para NEXT_PUBLIC_* no bundle.
# Runtime: env_file no compose (mesmo conteudo).

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
# Carrega só NEXT_PUBLIC_* — evita que RESEND_FROM com "<>" quebre `source` do env inteiro.
RUN --mount=type=secret,id=env_file \
    set -eu && \
    sed '1s/^\xEF\xBB\xBF//' /run/secrets/env_file \
      | grep -E '^[[:space:]]*NEXT_PUBLIC_' \
      | sed 's/^[[:space:]]*//' \
      | tr -d '\r' > /tmp/next-public.env && \
    test -s /tmp/next-public.env || { echo "FATAL: nenhuma NEXT_PUBLIC_ no secret de build"; exit 1; } && \
    grep -q '^NEXT_PUBLIC_SUPABASE_URL=' /tmp/next-public.env || { echo "FATAL: falta NEXT_PUBLIC_SUPABASE_URL"; exit 1; } && \
    set -a && . /tmp/next-public.env && set +a && \
    npm run build --workspace=@nextgen/web && \
    REF=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' /tmp/next-public.env | cut -d= -f2- | tr -d '\r' | sed 's|https://||') && \
    grep -rq "$REF" /app/apps/web/.next/static/chunks/ || { echo "FATAL: host Supabase ausente no bundle client"; exit 1; }

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
