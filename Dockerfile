# Intended for a single-node synthetic-data pilot, behind HTTPS reverse proxy.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 CAREINDEX_DB_PATH=/app/data/careindex.sqlite
RUN useradd --system --uid 10001 --home /app careindex && mkdir -p /app/data /app/backups && chown 10001:10001 /app/data /app/backups
COPY --from=builder --chown=10001:10001 /app/.next/standalone ./
COPY --from=builder --chown=10001:10001 /app/.next/static ./.next/static
COPY --from=builder --chown=10001:10001 /app/public ./public
COPY --from=builder --chown=10001:10001 /app/scripts ./scripts
USER 10001
EXPOSE 3000
CMD ["node", "server.js"]
