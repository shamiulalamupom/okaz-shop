FROM node:20-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @okaz/shared build && pnpm --filter @okaz/media prisma:generate && pnpm --filter @okaz/media build

WORKDIR /app/apps/media

EXPOSE 4005

CMD ["pnpm", "start"]
