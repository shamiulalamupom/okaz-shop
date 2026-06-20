import { swaggerUI } from "@hono/swagger-ui";
import {
  correlationIdMiddleware,
  createContentLengthLimitMiddleware,
  createLogger,
  jsonError,
  requestLoggerMiddleware,
} from "@okaz/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { gatewayConfig } from "./config/gateway.config.js";
import { gatewayOpenApi } from "./docs/gateway.openapi.js";
import "./hono-env.js";
import { createLoginRateLimitMiddleware } from "./middleware/rate-limit.middleware.js";
import { securityHeadersMiddleware } from "./middleware/security-headers.middleware.js";
import { createAuthProxyRoutes } from "./modules/auth-proxy/auth-proxy.routes.js";
import { createProductsProxyRoutes } from "./modules/products-proxy/products-proxy.routes.js";
import { createStocksProxyRoutes } from "./modules/stocks-proxy/stocks-proxy.routes.js";
import { createOrdersProxyRoutes } from "./modules/orders-proxy/orders-proxy.routes.js";
import { createMediaProxyRoutes } from "./modules/media-proxy/media-proxy.routes.js";
import { createInternalRoutes } from "./modules/internal/internal.routes.js";
import { createDemoRoutes } from "./modules/demo/demo.routes.js";
import { createHealthRoutes } from "./modules/health/health.routes.js";

const logger = createLogger("gateway");

const gatewayApp = new Hono();

gatewayApp.use("*", correlationIdMiddleware());
gatewayApp.use("*", requestLoggerMiddleware(logger));
gatewayApp.use(
  "*",
  cors({
    origin: gatewayConfig.corsOrigin,
    allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);
gatewayApp.use("*", securityHeadersMiddleware());
gatewayApp.use(
  "/auth/register",
  createContentLengthLimitMiddleware(gatewayConfig.authRequestMaxBytes),
);
gatewayApp.use(
  "/auth/login",
  createLoginRateLimitMiddleware(gatewayConfig.loginRateLimit),
);
gatewayApp.use(
  "/auth/login",
  createContentLengthLimitMiddleware(gatewayConfig.authRequestMaxBytes),
);

gatewayApp.route("/", createHealthRoutes(gatewayConfig.authServiceUrl));
gatewayApp.get("/openapi.json", (c) => c.json(gatewayOpenApi));
gatewayApp.get("/docs", swaggerUI({ url: "/openapi.json" }));
gatewayApp.route("/auth", createAuthProxyRoutes(gatewayConfig.authServiceUrl));
gatewayApp.route(
  "/products",
  createProductsProxyRoutes(gatewayConfig.productsServiceUrl, gatewayConfig.jwt),
);
gatewayApp.route(
  "/stocks",
  createStocksProxyRoutes(gatewayConfig.stocksServiceUrl, gatewayConfig.jwt),
);
gatewayApp.route(
  "/stores",
  createStocksProxyRoutes(gatewayConfig.stocksServiceUrl, gatewayConfig.jwt),
);
gatewayApp.route(
  "/orders",
  createOrdersProxyRoutes(gatewayConfig.ordersServiceUrl, gatewayConfig.jwt),
);
gatewayApp.route(
  "/media",
  createMediaProxyRoutes(gatewayConfig.mediaServiceUrl, gatewayConfig.jwt),
);
gatewayApp.route(
  "/internal",
  createInternalRoutes(gatewayConfig.internalServiceSecret),
);
gatewayApp.route("/", createDemoRoutes(gatewayConfig.jwt));

gatewayApp.notFound((c) =>
  jsonError(c, 404, "Not Found", { code: "NOT_FOUND" }),
);

gatewayApp.onError((error, c) => {
  logger.error("unhandled_error", {
    message: error.message,
    requestId: c.get("requestId"),
  });

  return jsonError(c, 500, "Internal server error", { code: "INTERNAL_ERROR" });
});

export { gatewayApp };
