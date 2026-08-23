import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getTrustedCorsOrigins, isCorsPreflightAllowed, isTrustedCorsOrigin } from "../cors";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

const trustedCorsOrigins = getTrustedCorsOrigins(
  process.env.EXPO_WEB_PREVIEW_URL,
  process.env.EXPO_PACKAGER_PROXY_URL,
);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Credentialed browser access is limited to the local and configured Expo origins.
  app.use((req, res, next) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    const isTrustedOrigin = isTrustedCorsOrigin(origin, trustedCorsOrigins);

    if (isTrustedOrigin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      );
      res.header("Access-Control-Allow-Credentials", "true");
    }

    // Reject browser preflights from origins that are not trusted.
    if (req.method === "OPTIONS") {
      if (!isCorsPreflightAllowed(origin, trustedCorsOrigins)) {
        res.sendStatus(403);
        return;
      }
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Current API inputs are structured metadata and bounded Minds payloads; reject oversized bodies early.
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Keep parser and unexpected request failures JSON-shaped and free of raw exception details.
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const errorType = error instanceof Error ? error.name : "unknown";
    const isPayloadTooLarge =
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "entity.too.large";
    const statusCode = isPayloadTooLarge ? 413 : 500;
    const message = isPayloadTooLarge
      ? "Request payload is too large."
      : "The server could not process this request.";

    console.error("[api] Request failed", { errorType, statusCode });
    res.status(statusCode).json({ error: message });
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("[api] Server failed to start", {
    errorType: error instanceof Error ? error.name : "unknown",
  });
  process.exitCode = 1;
});
