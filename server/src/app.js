const express = require("express");
const path = require("path");
const { clerkMiddleware } = require("@clerk/express");
const healthRoutes = require("./modules/health/health.routes");
const productsRoutes = require("./modules/products/products.routes");
const ordersRoutes = require("./modules/orders/orders.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const platformRoutes = require("./modules/platform/platform.routes");
const customCakeRoutes = require("./modules/custom-cakes/custom-cakes.routes");
const siteSettingsRoutes = require("./modules/site-settings/site-settings.routes");
const clerkWebhooksRoutes = require("./modules/webhooks/clerk-webhooks.routes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");
const { nodeEnv, clientOrigins } = require("./config/env");

const app = express();
app.disable("x-powered-by");
app.use((request, response, next) => {
  const origin = request.get("Origin")?.replace(/\/+$/, "");
  if (!origin) return next();
  const isLocalDevelopmentOrigin = nodeEnv !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
  const isConfiguredOrigin = clientOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) return true;
    if (!allowedOrigin.includes("*")) return false;
    const expression = `^${allowedOrigin.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, "[^.]+")}$`;
    return new RegExp(expression, "i").test(origin);
  });
  if (!isConfiguredOrigin && !isLocalDevelopmentOrigin) {
    const error = new Error("This origin is not allowed to access the API.");
    error.status = 403;
    error.code = "cors_origin_forbidden";
    return next(error);
  }
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (request.method === "OPTIONS") return response.sendStatus(204);
  return next();
});
app.use(clerkMiddleware());
app.use("/api/webhooks/clerk", express.raw({ type: "application/json" }), clerkWebhooksRoutes);
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  if (nodeEnv === "production") response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(express.json({ limit: "100kb" }));
app.use("/api", healthRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/custom-cakes", customCakeRoutes);
app.use("/api/site-settings", siteSettingsRoutes);
app.use("/api", platformRoutes);
const distDirectory = path.resolve(__dirname, "../../client/dist");
app.use(express.static(distDirectory, { index: false, maxAge: nodeEnv === "production" ? "1h" : 0 }));
app.get("*", (request, response, next) => {
  if (request.path.startsWith("/api/")) return next();
  response.sendFile(path.join(distDirectory, "index.html"), error => error ? next(error) : undefined);
});
app.use(notFound);
app.use(errorHandler);
module.exports = app;
