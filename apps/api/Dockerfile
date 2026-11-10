# API image: `docker compose --profile full up` (T-02), base for the demo deploy (T-09).
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@10.34.6
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
RUN pnpm install --frozen-lockfile --filter @studyflow/api

COPY apps/api apps/api
RUN pnpm --filter @studyflow/api build

WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
