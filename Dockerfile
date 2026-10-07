FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM base AS builder
# Optional sub-path such as /webp-forge; fixed at build time.
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ARG BASE_PATH=""
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 \
    OUTPUT_DIR=/app/data/output UPLOAD_DIR=/app/data/uploads \
    BASE_PATH=$BASE_PATH
# The short root entrypoint only prepares mounts, then drops to the node user.
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/data/output /app/data/uploads \
    && chown -R node:node /app/data
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/webp-forge-entrypoint
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000'+(process.env.BASE_PATH||'')+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["webp-forge-entrypoint"]
CMD ["node", "server.js"]
