import type { MiddlewareHandler } from "hono";

export const securityHeadersMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    await next();

    const isSwaggerDocs = c.req.path === "/docs";

    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "no-referrer");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (isSwaggerDocs) {
      c.header(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
          "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
          "img-src 'self' data:",
          "font-src 'self' data: https://cdn.jsdelivr.net",
          "connect-src 'self' https://cdn.jsdelivr.net",
          "frame-ancestors 'none'",
        ].join("; "),
      );
    } else {
      c.header(
        "Content-Security-Policy",
        "default-src 'self'; frame-ancestors 'none';",
      );
    }
  };
};
