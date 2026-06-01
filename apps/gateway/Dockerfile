FROM node:20-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @okaz/shared build && pnpm --filter @okaz/gateway build

WORKDIR /app/apps/gateway

EXPOSE 4000

CMD ["pnpm", "start"]
