FROM node:20-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --no-frozen-lockfile

WORKDIR /app/apps/products

EXPOSE 4002

CMD ["pnpm", "start"]
