import express from "express";
import multer from "multer";
import { randomBytes } from "crypto";
import { getDb } from "./db";
import { manuals, projects, users, creditTransactions } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { storagePut } from "./storage";
import { runProcessingJob } from "./processingJob";
import { authService } from "./_core/auth";
import { calcCreditCost } from "./stripeProducts";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB hard limit
const MAX_PAGES = 150; // 150-page limit — covers virtually all real-world consumer manuals

// Bomb-file protection: reject any PDF whose declared internal size is
// suspiciously larger than the raw upload (e.g. a zip-bomb disguised as PDF).
// We allow up to 4× expansion from compression (generous for real PDFs).
const MAX_DECOMPRESSED_RATIO = 4;

// ── Multer setup ──────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const isMimePdf = file.mimetype === "application/pdf";
    const isExtPdf = file.originalname.toLowerCase().endsWith(".pdf");
    if (isMimePdf || isExtPdf) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Only PDF files are accepted. You uploaded a "${file.mimetype || "unknown"}" file. ` +
          `Please convert your manual to PDF and try again.`
        )
      );
    }
  },
});

// ── Per-user in-progress job tracker (in-memory, resets on server restart) ───
// Maps userId → projectId currently being processed.
// This prevents a user from queueing multiple concurrent jobs.
const activeJobs = new Map<number, number>();

export const uploadRouter = express.Router();

// ── Auth middleware ────────────────────────────────────────────────────────────
async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const user = await authService.authenticateRequest(req as any);
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Not authenticated. Please sign in and try again." });
  }
}

// ── Upload endpoint ────────────────────────────────────────────────────────────
uploadRouter.post(
  "/api/projects/:projectId/upload",
  requireAuth,
  (req, res, next) => {
    upload.single("manual")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          error:
            `Your file is too large. The maximum allowed size is 50 MB. ` +
            `Please compress your PDF or split it into smaller sections and try again.`,
          code: "FILE_TOO_LARGE",
        });
        return;
      }
      if (err) {
        res.status(400).json({ error: err.message, code: "INVALID_FILE" });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const user = (req as any).user;

    try {
      const projectId = Number(req.params.projectId);
      const file = req.file;

      // ── Basic file presence check ────────────────────────────────────────
      if (!file) {
        res.status(400).json({ error: "No file received. Please select a PDF and try again.", code: "NO_FILE" });
        return;
      }

      // ── Magic-byte validation: must start with %PDF ───────────────────────
      const magic = file.buffer.slice(0, 4).toString("ascii");
      if (magic !== "%PDF") {
        res.status(400).json({
          error:
            "The uploaded file does not appear to be a valid PDF (incorrect file header). " +
            "Please ensure you are uploading an actual PDF file, not a renamed document.",
          code: "INVALID_PDF_HEADER",
        });
        return;
      }

      // ── Bomb-file protection ──────────────────────────────────────────────
      // Scan for /Length entries in the raw PDF bytes to estimate decompressed size.
      // A legitimate PDF should not have stream lengths that vastly exceed the file size.
      const rawText = file.buffer.toString("latin1");
      const lengthMatches = rawText.match(/\/Length\s+(\d+)/g) ?? [];
      const totalDeclaredLength = lengthMatches.reduce((sum, m) => {
        const n = parseInt(m.replace(/\/Length\s+/, ""), 10);
        return sum + (isNaN(n) ? 0 : n);
      }, 0);

      if (totalDeclaredLength > file.size * MAX_DECOMPRESSED_RATIO) {
        res.status(400).json({
          error:
            "This file was rejected because its internal structure suggests it may be a malformed or " +
            "potentially harmful document. Please try a different PDF.",
          code: "SUSPICIOUS_FILE",
        });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Database unavailable. Please try again in a moment." });
        return;
      }

      // ── Ownership check ───────────────────────────────────────────────────
      const projectRows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
        .limit(1);

      if (!projectRows.length) {
        res.status(404).json({ error: "Project not found." });
        return;
      }

      // ── Per-user sequential job queue ─────────────────────────────────────
      // Check both the in-memory tracker AND the database for any project
      // currently in "processing" status for this user. The DB check handles
      // the case where the server restarted mid-job.
      const inMemoryJob = activeJobs.get(user.id);
      if (inMemoryJob !== undefined) {
        res.status(429).json({
          error:
            `You already have a manual being processed (project #${inMemoryJob}). ` +
            `Please wait for it to finish before uploading another.`,
          code: "JOB_IN_PROGRESS",
          activeProjectId: inMemoryJob,
        });
        return;
      }

      // Also check DB for any processing project belonging to this user
      const processingProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.userId, user.id), eq(projects.status, "processing")))
        .limit(1);

      if (processingProjects.length > 0) {
        const activeId = processingProjects[0].id;
        res.status(429).json({
          error:
            `You already have a manual being processed (project #${activeId}). ` +
            `Please wait for it to finish before uploading another.`,
          code: "JOB_IN_PROGRESS",
          activeProjectId: activeId,
        });
        return;
      }

      // ── Credit check ──────────────────────────────────────────────────────
      const creditCost = calcCreditCost(file.size);
      const userRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      const currentCredits = userRows[0]?.credits ?? 0;

      if (currentCredits < creditCost) {
        const needed = creditCost - currentCredits;
        res.status(403).json({
          error:
            `Not enough credits. This manual (${(file.size / (1024 * 1024)).toFixed(1)} MB) costs ` +
            `${creditCost} credit${creditCost > 1 ? "s" : ""}, but you only have ${currentCredits}. ` +
            `You need ${needed} more credit${needed > 1 ? "s" : ""}. ` +
            `Visit the Pricing page to top up.`,
          code: "INSUFFICIENT_CREDITS",
          creditCost,
          currentCredits,
          creditsNeeded: needed,
        });
        return;
      }

      // ── Page count check ──────────────────────────────────────────────────
      let pageCount = 0;
      try {
        const { getPdfInfo } = await import("./pdfProcessor");
        const info = await getPdfInfo(file.buffer);
        pageCount = info.pageCount;
      } catch {
        // If we can't parse it, let the processing job handle it gracefully
      }

      // ── Page count check (150-page limit) ─────────────────────────────────
      if (pageCount > MAX_PAGES) {
        res.status(400).json({
          error:
            `This manual has ${pageCount} pages, which exceeds the ${MAX_PAGES}-page limit. ` +
            `For very large manuals, consider splitting them into sections and uploading each part separately.`,
          code: "TOO_MANY_PAGES",
          pageCount,
          maxPages: MAX_PAGES,
        });
        return;
      }

      // ── Deduct credits atomically (before processing starts) ─────────────
      await db
        .update(users)
        .set({ credits: sql`credits - ${creditCost}` })
        .where(eq(users.id, user.id));

      await db.insert(creditTransactions).values({
        userId: user.id,
        credits: -creditCost,
        reason: "spend",
        projectId,
      });

      // ── Upload to S3 ──────────────────────────────────────────────────────
      const randomSuffix = randomBytes(8).toString("hex");
      const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const s3Key = `manuals/${user.id}/${projectId}/${Date.now()}-${randomSuffix}-${safeFilename}`;
      const { url: s3Url } = await storagePut(s3Key, file.buffer, "application/pdf");

      // Save or update manual record
      const existing = await db.select().from(manuals).where(eq(manuals.projectId, projectId)).limit(1);
      if (existing.length > 0) {
        await db.update(manuals).set({
          s3Key,
          s3Url,
          filename: file.originalname,
          fileSizeBytes: file.size,
          pageCount,
        }).where(eq(manuals.projectId, projectId));
      } else {
        await db.insert(manuals).values({
          projectId,
          filename: file.originalname,
          s3Key,
          s3Url,
          fileSizeBytes: file.size,
          pageCount,
        });
      }

      // Update project status
      await db.update(projects).set({
        status: "processing",
        creditsCost: creditCost,
      }).where(eq(projects.id, projectId));

      // ── Register job in per-user tracker ─────────────────────────────────
      activeJobs.set(user.id, projectId);

      // ── Run processing job in background ─────────────────────────────────
      runProcessingJob(projectId)
        .catch((err) => {
          console.error(`[Upload] Processing job failed for project ${projectId}:`, err);
        })
        .finally(() => {
          // Always release the lock when the job finishes (success or failure)
          if (activeJobs.get(user.id) === projectId) {
            activeJobs.delete(user.id);
          }
        });

      res.json({
        success: true,
        message: "Upload successful. Processing started.",
        creditCost,
        remainingCredits: currentCredits - creditCost,
      });
    } catch (err) {
      console.error("[Upload] Error:", err);
      // Release lock on unexpected error
      if (user?.id) {
        activeJobs.delete(user.id);
      }
      res.status(500).json({ error: "Upload failed due to an unexpected error. Please try again." });
    }
  }
);
