# okaz-backend

Monorepo for a Hono-based API Gateway + Auth service with Prisma/PostgreSQL.

## Stack

- Node.js + TypeScript
- Hono
- Prisma + PostgreSQL
- JWT auth (Bearer)
- Argon2id password hashing
- Vitest e2e tests

## Monorepo Layout

- `apps/gateway` - public API entrypoint, auth middleware, rate limiting, proxying
- `apps/auth` - registration/login/me, Prisma user store
- `packages/shared` - shared env, logger, jwt, middleware, types, error helpers

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose

## Setup

1. Copy `.env.example` to `.env` and set values.
2. Install dependencies:
   - `pnpm install`
3. Start PostgreSQL and services:
   - `docker compose up --build -d`

## Prisma Migration + Seed

Run against local containerized PostgreSQL:

- `pnpm prisma:migrate`
- `pnpm prisma:seed`

Dev seed creates/upserts one admin account (dev-only fixture):

- email: `admin@example.com`
- password: `Admin1234!`

Do not run seed in production.

## Local App URLs

- Gateway: `http://localhost:4000`
- Gateway docs: `http://localhost:4000/docs`
- Auth service: `http://localhost:4001`
- Auth docs: `http://localhost:4001/docs`

## Health

Both apps expose:

- `GET /live`
- `GET /ready`

## Tests

Integration tests assume services are running (typically via `docker compose up`).

- `pnpm test`

## Security Baseline

- Password hashing with Argon2id
- JWT verified with signature, exp, iss, aud checks
- Correlation ID (`X-Request-Id`) generated at gateway and propagated
- Login rate limiting at gateway (`/auth/login`)
- Auth request payload size limit (`AUTH_REQUEST_MAX_BYTES`, default `1024`)
- CORS enabled only at gateway
- Gateway security headers enabled
- Structured JSON logs with sensitive redaction
