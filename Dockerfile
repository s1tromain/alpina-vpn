# syntax=docker/dockerfile:1.6
# Alpina VPN — frontend (Next.js 15) production image.
# Uses Next's `output: "standalone"` (see next.config.js) so the final
# image only ships the server runtime + the files it actually serves.

# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

# ---------- Stage 2: build ----------
FROM node:20-alpine AS build
WORKDIR /app

# NEXT_PUBLIC_* variables are inlined into the client bundle at build time,
# so they MUST be supplied as build args (not just runtime env) for prod.
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=""
ARG NEXT_PUBLIC_SUPPORT_HANDLE=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME \
    NEXT_PUBLIC_SUPPORT_HANDLE=$NEXT_PUBLIC_SUPPORT_HANDLE \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache tini \
 && addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# The standalone output already contains node_modules/.bin and server.js.
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public

USER app
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
