# Build context is the extracted, verified GitHub Actions standalone runtime.
# No npm installation or compilation is needed on the low-memory host.
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 CAREINDEX_DB_PATH=/app/data/careindex.sqlite TRAVEL_DB_PATH=/app/data/travel.sqlite
RUN useradd --system --uid 10001 --home /app careindex && mkdir -p /app/data /app/backups && chown 10001:10001 /app/data /app/backups
COPY --chown=10001:10001 . .
USER 10001
EXPOSE 3000
CMD ["node", "server.js"]
