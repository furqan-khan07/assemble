import { getDb } from "./db";
import { manuals, projects, stepSessions, users, creditTransactions } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import {
  getPdfInfo,
  renderPdfPages,
  uploadPageImagesToS3,
  extractTextChunks,
  chunkText,
  embedAndStore,
  deleteCollection,
} from "./pdfProcessor";
import { generateAllStepsFromImages, generateAllStepsFromText } from "./stepGenerator";
import type { AssemblyStep } from "../shared/assemblyTypes";
import { storageGet } from "./storage";
import fs from "fs";
import path from "path";
import os from "os";


async function downloadFile(url: string, dest: string): Promise<void> {
  // Use fetch so redirects are followed automatically (https.get does not follow redirects)
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to download PDF: HTTP ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Sanity check: first 4 bytes of a valid PDF are "%PDF"
  const magic = buffer.slice(0, 4).toString("ascii");
  if (magic !== "%PDF") {
    throw new Error(
      `Downloaded file is not a valid PDF (magic bytes: ${JSON.stringify(magic)}). ` +
      `The storage URL may have expired or returned an error page.`
    );
  }

  fs.writeFileSync(dest, buffer);
}

async function refundCredits(userId: number, creditCost: number, projectId: number): Promise<void> {
  const db = await getDb();
  if (!db || creditCost <= 0) return;
  try {
    // Deduplication: only refund if no refund transaction already exists for this project
    const refundCheck = await db
      .select({ id: creditTransactions.id, reason: creditTransactions.reason })
      .from(creditTransactions)
      .where(eq(creditTransactions.projectId, projectId))
      .limit(20);

    const hasRefund = refundCheck.some((tx) => tx.reason === "refund");
    if (hasRefund) {
      console.log(`[ProcessingJob] Refund already exists for project ${projectId} — skipping duplicate refund`);
      return;
    }

    await db
      .update(users)
      .set({ credits: sql`credits + ${creditCost}` })
      .where(eq(users.id, userId));

    await db.insert(creditTransactions).values({
      userId,
      credits: creditCost,
      reason: "refund",
      projectId,
    });

    console.log(`[ProcessingJob] Refunded ${creditCost} credit(s) to user ${userId} for failed project ${projectId}`);
  } catch (refundErr) {
    console.error(`[ProcessingJob] Failed to refund credits for user ${userId}:`, refundErr);
  }
}

export async function runProcessingJob(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `assembleai-${projectId}-`));
  const pdfPath = path.join(tmpDir, "manual.pdf");

  // Read project data FIRST before marking as processing
  // This ensures userId and creditsCost are always populated for refunds,
  // even if the job fails immediately after starting.
  const projectRows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!projectRows.length) throw new Error("Project not found");
  let userId: number = projectRows[0].userId;
  let creditsCost: number = projectRows[0].creditsCost ?? 0;
  const projectName = projectRows[0].name ?? "Assembly";

  try {
    // Mark as processing
    await db.update(projects).set({ status: "processing" }).where(eq(projects.id, projectId));

    // Get manual record
    const manualRows = await db.select().from(manuals).where(eq(manuals.projectId, projectId)).limit(1);
    if (!manualRows.length) throw new Error("No manual found for project");
    const manual = manualRows[0];

    // Download PDF from S3
    console.log(`[ProcessingJob] Downloading PDF for project ${projectId}...`);
    const { url } = await storageGet(manual.s3Key);
    await downloadFile(url, pdfPath);

    const pdfBuffer = fs.readFileSync(pdfPath);

    // Get page count and detect if image-only
    console.log(`[ProcessingJob] Analysing PDF for project ${projectId}...`);
    const { pageCount, hasText } = await getPdfInfo(pdfBuffer);
    const isImageOnly = !hasText;

    await db.update(manuals).set({ pageCount, isImageOnly }).where(eq(manuals.id, manual.id));

    console.log(`[ProcessingJob] PDF: ${pageCount} pages, hasText=${hasText}, isImageOnly=${isImageOnly}`);

    // ── RENDER ALL PAGES TO IMAGES ────────────────────────────────────────────
    // We always render pages to images regardless of whether the PDF has text.
    // This is the key fix: the AI sees the ACTUAL diagrams, not text descriptions.
    const imgDir = path.join(tmpDir, "pages");
    fs.mkdirSync(imgDir, { recursive: true });

    console.log(`[ProcessingJob] Rendering pages to images for project ${projectId}...`);
    const imagePaths = await renderPdfPages(pdfPath, pageCount, imgDir, 40);

    if (imagePaths.length === 0) {
      throw new Error(
        "Could not render any pages from the PDF. The file may be corrupted or password-protected."
      );
    }

    console.log(`[ProcessingJob] Rendered ${imagePaths.length} pages. Uploading to S3...`);
    const pageImageUrls = await uploadPageImagesToS3(imagePaths, projectId);

    console.log(`[ProcessingJob] Uploaded ${pageImageUrls.length} page images. Generating steps...`);

    // ── GENERATE STEPS FROM ACTUAL IMAGES ────────────────────────────────────
    // Send all page images to GPT-4o vision in batches.
    // The model sees the real diagrams and generates steps from what it literally sees.
    const allSteps = await generateAllStepsFromImages(pageImageUrls, projectName);
    const totalSteps = allSteps.length;

    console.log(`[ProcessingJob] Generated ${totalSteps} steps for project ${projectId}.`);

    // ── EMBED TEXT CHUNKS FOR CLARIFY QUERIES (optional — skip if ChromaDB unavailable) ─
    try {
      const collectionId = `project-${projectId}`;
      await deleteCollection(collectionId);

      let textChunks: string[];
      if (hasText) {
        textChunks = await extractTextChunks(pdfBuffer);
      } else {
        textChunks = allSteps.map((s: AssemblyStep, i: number) => `Step ${i + 1}: ${s.title}\n${s.substeps.join("\n")}\nCheck: ${s.check}`);
      }

      if (textChunks.length > 0) {
        await embedAndStore(
          collectionId,
          textChunks,
          textChunks.map((_, i) => ({ chunkIndex: i, projectId }))
        );
        await db.update(manuals).set({ chromaCollectionId: collectionId }).where(eq(manuals.id, manual.id));
      }
    } catch (chromaErr) {
      // ChromaDB is not available in all environments — log and continue.
      // The clarify feature will be unavailable but the main pipeline completes.
      console.warn(`[ProcessingJob] ChromaDB unavailable for project ${projectId} — skipping embed:`, chromaErr instanceof Error ? chromaErr.message : chromaErr);
    }

    // Create or update step session
    const existingSessions = await db
      .select()
      .from(stepSessions)
      .where(eq(stepSessions.projectId, projectId))
      .limit(1);

    if (existingSessions.length === 0) {
      await db.insert(stepSessions).values({
        projectId,
        currentStep: 1,
        totalSteps,
        stepsData: JSON.stringify(allSteps),
      });
    } else {
      await db
        .update(stepSessions)
        .set({ totalSteps, stepsData: JSON.stringify(allSteps), currentStep: 1 })
        .where(eq(stepSessions.projectId, projectId));
    }

    // Mark project as ready
    await db
      .update(projects)
      .set({ status: "ready", totalSteps, currentStep: 1 })
      .where(eq(projects.id, projectId));

    console.log(`[ProcessingJob] Project ${projectId} ready with ${totalSteps} steps.`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[ProcessingJob] Failed for project ${projectId}:`, errorMessage);

    await db
      .update(projects)
      .set({ status: "failed", errorMessage })
      .where(eq(projects.id, projectId));

    if (userId !== null && creditsCost > 0) {
      await refundCredits(userId, creditsCost, projectId);
    }

    throw err;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
