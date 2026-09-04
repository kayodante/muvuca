# syntax=docker/dockerfile:1

# Muvuca — production image built on Next.js standalone output.
# Build:  docker build -t muvuca .
# Run:    docker run -p 3000:3000 --env-file .env.local muvuca

FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

# ---- deps: install with a frozen lockfile, nothing else ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: compile the Next.js app ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public, non-secret values only: NEXT_PUBLIC_* is inlined into the client
# bundle at build time, so anything private must stay out of this stage.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# Only the Docker image needs the standalone bundle (see next.config.ts) --
# a plain `pnpm build` outside this Dockerfile must not produce it, since
# `next start` refuses to serve standalone output.
ENV BUILD_STANDALONE=1
RUN pnpm build

# ---- runtime: minimal image, only the standalone server output ----
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# .next/standalone bundles only the production node_modules subset the
# server needs, but it does not include static assets — those are copied
# in explicitly per Next.js's documented standalone deployment layout.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
