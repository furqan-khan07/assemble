import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerAuthRoutes } from "./authRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { uploadRouter } from "../uploadRouter";
import { stripeRouter } from "../stripeRouter";
import { getDb } from "../db";
import { projects } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { runProcessingJob } from "../processingJob";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
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

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Railway / reverse proxy support
  app.set("trust proxy", 1);

  // Security headers — applied before all routes
  // contentSecurityPolicy is disabled in dev (Vite HMR needs inline scripts)
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false, // Required for Vite/browser compat
    })
  );
  // Remove X-Powered-By (helmet does this, but be explicit)
  app.disable("x-powered-by");

  // ── Rate limiting ──────────────────────────────────────────────────────
  // Strict limiter for auth routes (brute-force protection)
  const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again in a minute." },
  });
  app.use("/api/auth", authLimiter);

  // General API limiter
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
  });
  app.use("/api", apiLimiter);

  // Stripe webhook MUST be registered before json() middleware (needs raw body)
  app.use("/api/stripe", stripeRouter);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  // File upload routes (multipart/form-data)
  app.use(uploadRouter);
  // Auth routes (register + login)
  registerAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // ── Startup recovery: re-run any jobs stuck in 'processing' state ──────────
  // These occur when the server restarts mid-job (deployment, crash, etc.).
  // The PDF is already in S3, so we can restart the job from scratch.
  // We do this in the background so the server starts accepting requests immediately.
  setTimeout(async () => {
    try {
      const db = await getDb();
      if (!db) return;
      const stuckProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.status, "processing"));

      if (stuckProjects.length > 0) {
        console.log(`[startup] Found ${stuckProjects.length} interrupted job(s) — re-running them`);
        for (const p of stuckProjects) {
          console.log(`[startup] Re-running processing job for project ${p.id}`);
          // Reset to pending so runProcessingJob can set it back to processing
          await db
            .update(projects)
            .set({ status: "new" })
            .where(eq(projects.id, p.id));
          // Re-run the job in the background (don't await — let it run concurrently)
          runProcessingJob(p.id).catch((err) => {
            console.error(`[startup] Re-run failed for project ${p.id}:`, err);
          });
        }
      }
    } catch (err) {
      console.error("[startup] Recovery check failed:", err);
    }
  }, 3000); // Wait 3s after server start before re-running jobs
}

startServer().catch(console.error);
