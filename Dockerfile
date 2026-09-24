FROM node:22-bookworm-slim AS build

WORKDIR /workspace
RUN apt-get update \
  && apt-get install --no-install-recommends --yes \
    build-essential \
    python3 \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/application/package.json packages/application/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm deploy --filter @luma/api --prod /runtime/api

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
COPY --from=build /runtime/api ./api
COPY --from=build /workspace/apps/web/dist ./web

RUN useradd --system --create-home --uid 10001 luma \
  && mkdir -p /app/data \
  && chown -R luma:luma /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=file:/app/data/luma.db \
    DATA_DIR=/app/data \
    WEB_DIST_DIR=/app/web

USER luma
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "/app/api/dist/server.js"]
