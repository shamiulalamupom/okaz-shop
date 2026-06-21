# okaz-backend

Marketplace platform built as a **microservices architecture** behind a single **API Gateway**, with an Angular frontend. Inspired by the Keyce B3 annual project brief (Amazon-like marketplace).

## Architecture

```
                         ┌────────────────────────┐
   Angular frontend ───▶ │   API Gateway (:4000)  │  ◀── single entry point
   (REST + WebSocket)    │  JWT, roles, CORS,     │
                         │  rate-limit, headers,  │
                         │  proxy, WS event hub   │
                         └───────────┬────────────┘
            ┌────────────────┬───────┴────────┬─────────────────┐
            ▼                ▼                ▼                  ▼
     Auth (:4001)    Products (:4002)   Stocks (:4003)    Orders (:4004)
     PostgreSQL        MongoDB           PostgreSQL         PostgreSQL
     users/roles/JWT   catalogue         qty/product/store  create + validate
```

- The frontend **only** talks to the gateway. Microservices are not exposed publicly.
- Microservices map to **functional domains** (auth, products, stocks, orders), not to stores.
- Critical order events are pushed to the frontend in **real time over WebSocket** via the gateway.

## Microservices

| Service     | Port | Stack                | Data                | Responsibility |
|-------------|------|----------------------|---------------------|----------------|
| `gateway`   | 4000 | Hono / TS            | —                   | Single entry point: auth, roles, rate-limit, security headers, CORS, request proxying, WebSocket event hub |
| `auth`      | 4001 | Hono / TS / Prisma   | PostgreSQL          | Users, roles, JWT issuance, Argon2id password hashing |
| `products`  | 4002 | Express / JS / Mongoose | MongoDB          | Global product catalogue |
| `stocks`    | 4003 | Hono / TS / Prisma   | PostgreSQL          | Stores + available quantity per product **per store**; atomic stock reservation |
| `orders`    | 4004 | Hono / TS / Prisma   | PostgreSQL          | Order creation + validation against stock; cancellation/restock |

`packages/shared` provides shared env loading, structured logging (with secret redaction), JWT sign/verify, request helpers, error helpers and middleware.

## Order flow (stock validation)

1. An authenticated user POSTs `/orders` with line items (`productId`, `storeId`, `quantity`).
2. Orders fetches each product's price from the **products** service.
3. The order is persisted as `PENDING`, then orders calls the **stocks** service's internal `reserve` endpoint, which **atomically** checks and decrements every line in a single DB transaction.
4. If all lines have sufficient stock → order becomes `VALIDATED`; otherwise → `REJECTED` (no stock is consumed).
5. Each transition is published to the gateway, which broadcasts it over WebSocket to the owning user.

## Real-time events

- Clients open `ws://localhost:4000/ws?token=<JWT>`. The token is verified before the socket is accepted.
- Microservices POST events to the gateway's secret-guarded `/internal/events`; the gateway fans them out to the relevant user's sockets.
- Event types: `order.created`, `order.validated`, `order.rejected`, `order.cancelled`.

## Security

- Passwords hashed with **Argon2id** (never stored or logged in clear) — GDPR/CNIL-safe.
- **JWT** (HS256, jose) verified for signature, `exp`, `iss`, `aud`. Verified both at the gateway and inside the orders service (defense in depth).
- **Role-based access**: writing stocks/stores requires `STORE_MANAGER` or `ADMIN`; ordering requires an authenticated user; an admin demo route requires `ADMIN`.
- Gateway: CORS, security headers, login rate limiting, request payload size limits, correlation IDs (`X-Request-Id`).
- Internal service-to-service routes (`/internal/*`) are guarded by a shared `INTERNAL_SERVICE_SECRET` and are never proxied to the public.
- Structured JSON logs with automatic redaction of sensitive fields.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose

## Run everything with Docker (recommended)

```bash
cp .env.example .env          # then edit secrets (see below)
docker compose up --build -d
```

This builds and starts PostgreSQL, MongoDB, and all five services. On first start (fresh Postgres volume) the `okaz_auth`, `okaz_stocks` and `okaz_orders` databases are created automatically, Prisma migrations are applied, and the stocks service seeds a few demo stores.

> Set strong values in `.env` for `AUTH_JWT_SECRET` (≥32 chars) and `INTERNAL_SERVICE_SECRET` (≥16 chars). These must match across the gateway, orders and stocks services (the compose file already wires them from the same variables).

Seed everything (users, products + stock, addresses, sample orders) with one command — run it against the running Docker stack:

```bash
pnpm seed
```

This seeds the users, resets transactional data and creates the catalogue + demo orders. Dev accounts:

| Email | Password | Role |
|---|---|---|
| admin@example.com | Admin1234! | ADMIN |
| manager@example.com | Manager1234! | STORE_MANAGER |
| alice@example.com / bob@example.com | Password123 | CUSTOMER |

## Service URLs

| What            | URL |
|-----------------|-----|
| Frontend (web)  | http://localhost:4200 |
| Gateway         | http://localhost:4000 |
| Gateway docs    | http://localhost:4000/docs |
| Auth docs       | http://localhost:4001/docs |
| Products docs   | http://localhost:4002/api-docs |
| Stocks docs     | http://localhost:4003/docs |
| Orders docs     | http://localhost:4004/docs |
| WebSocket       | ws://localhost:4000/ws?token=&lt;JWT&gt; |

All services expose `GET /live` and `GET /ready`.

## Public API (through the gateway)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/register` | public | |
| POST | `/auth/login` | public | returns `accessToken` |
| GET  | `/auth/me` | JWT | |
| GET  | `/products` `/products/:id` | public | catalogue browsing |
| POST/PUT/DELETE | `/products...` | JWT | |
| GET  | `/stores` | JWT | |
| POST | `/stores` | STORE_MANAGER/ADMIN | |
| GET  | `/stocks?productId=&storeId=` | JWT | |
| GET  | `/stocks/:productId` | JWT | aggregated across stores |
| POST | `/stocks` `/stocks/adjust` | STORE_MANAGER/ADMIN | set / adjust quantity |
| GET  | `/orders` | JWT | current user's orders |
| POST | `/orders` | JWT | create + validate against stock |
| GET  | `/orders/:id` | JWT | |
| POST | `/orders/:id/cancel` | JWT | releases reserved stock |

## Local development (without Docker)

Each service can run individually with `pnpm --filter @okaz/<service> dev`. You need PostgreSQL and MongoDB available and a `.env` per the variables in `.env.example`. Generate Prisma clients first with `pnpm --filter @okaz/<service> prisma:generate`.

## Tests

```bash
pnpm test
```

## Frontend

The Angular frontend lives in `apps/web` (authentication and catalogue today; stock view, order creation and real-time order tracking are in progress). It talks only to the gateway (`http://localhost:4000`).

Run it as part of the Docker stack — `docker compose up --build -d` now also builds and serves the frontend (static SPA via nginx) at **http://localhost:4200**. The `web` container is built from `apps/web/Dockerfile` (multi-stage: `ng build` → nginx) and its origin (`http://localhost:4200`) matches the gateway's default `CORS_ORIGIN`.

For local development without Docker, use `cd apps/web && npm install && npm start` (`ng serve` on `:4200`).
