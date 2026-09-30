/**
 * pdfProcessor.ts
 *
 * PDF processing utilities — 100% Node.js native, no system binaries required.
 * Uses pdfjs-dist (Mozilla PDF.js) + @napi-rs/canvas for PDF-to-image rendering.
 *
 * IMPORTANT: pdf-parse has been intentionally removed from this project because it
 * bundles its own copy of pdfjs-dist (a different version), which causes the
 * "API version does not match Worker version" error at runtime. All PDF operations
 * now go through a single pdfjs-dist instance to prevent version conflicts.
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { randomBytes } from "crypto";
import { storagePut } from "./storage";

// ─── Concurrency helper ─────────────────────────────────────────────────────

/**
 * Run async tasks with a concurrency limit.
 * Each task is a zero-arg async function. Maintains ordering via index.
 */
export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

// ─── pdfjs-dist singleton setup ──────────────────────────────────────────────
// We resolve the worker path at module load time and cache the pdfjs module
// so GlobalWorkerOptions is only set once, preventing any race conditions.

const _require = createRequire(import.meta.url);
const _pdfjsDistPath = path.dirname(_require.resolve("pdfjs-dist/package.json"));
const PDFJS_WORKER_SRC = `file://${path.join(_pdfjsDistPath, "legacy/build/pdf.worker.mjs")}`;

let _pdfjsLib: any = null;

async function getPdfjsLib(): Promise<any> {
  if (_pdfjsLib) return _pdfjsLib;
  _pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
  // Set the worker ONCE at module load time. This must match the installed version.
  _pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
  console.log(`[pdfProcessor] pdfjs-dist loaded, worker: ${PDFJS_WORKER_SRC}`);
  return _pdfjsLib;
}

// ─── Shared document loader ───────────────────────────────────────────────────

async function loadPdfDocument(pdfBuffer: Buffer): Promise<any> {
  const pdfjsLib = await getPdfjsLib();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    verbosity: 0,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  });
  return loadingTask.promise;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000";

// ChromaDB is optional — lazily instantiated so the module loads fine without it.
let _chroma: any = null;
async function getChromaClient(): Promise<any | null> {
  if (_chroma) return _chroma;
  try {
    const { ChromaClient } = await import("chromadb");
    _chroma = new ChromaClient({ path: CHROMA_URL });
    return _chroma;
  } catch {
    return null;
  }
}

// ─── PDF page count + info ────────────────────────────────────────────────────

/**
 * Get page count and text availability from a PDF buffer.
 * Uses pdfjs-dist exclusively — no pdf-parse, no version conflicts.
 */
export async function getPdfInfo(
  pdfBuffer: Buffer
): Promise<{ pageCount: number; hasText: boolean }> {
  let pageCount = 0;
  let hasText = false;

  try {
    const pdf = await loadPdfDocument(pdfBuffer);
    pageCount = pdf.numPages;

    // Extract text from first 3 pages to determine if this is a text-based PDF
    let totalText = "";
    const pagesToCheck = Math.min(3, pdf.numPages);
    for (let i = 1; i <= pagesToCheck; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim();
        totalText += pageText;
        page.cleanup();
      } catch {
        // ignore per-page errors
      }
    }

    // IKEA-style manuals have very little extractable text
    hasText = totalText.length > 300;

    await pdf.destroy();
  } catch (err) {
    console.error("[pdfProcessor] getPdfInfo error:", err);
  }

  return { pageCount, hasText };
}

// ─── Render PDF pages to PNG images using pdfjs-dist + @napi-rs/canvas ───────

/**
 * Render every page of a PDF to a PNG buffer using pdfjs-dist + @napi-rs/canvas.
 * Fully self-contained — no system binaries (no pdftoppm, no ImageMagick).
 *
 * Returns an array of PNG Buffers in page order.
 */
export async function renderPdfPagesToBuffers(
  pdfBuffer: Buffer,
  maxPages = 150
): Promise<Buffer[]> {
  const [pdfjsLib, canvasModule] = await Promise.all([
    getPdfjsLib(),
    import("@napi-rs/canvas"),
  ]);

  const { createCanvas } = canvasModule;

  const pdf = await loadPdfDocument(pdfBuffer);
  const totalPages = Math.min(pdf.numPages, maxPages);

  console.log(`[pdfProcessor] Rendering ${totalPages} pages (of ${pdf.numPages} total) via pdfjs-dist v${pdfjsLib.version ?? "unknown"}`);

  // Render pages in parallel with concurrency limit (CPU-bound)
  const RENDER_CONCURRENCY = 5;
  const buffers: Buffer[] = new Array(totalPages);

  async function renderPage(pageNum: number): Promise<void> {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.08 }); // 150 DPI
    const width = Math.round(viewport.width);
    const height = Math.round(viewport.height);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d") as any;

    await page.render({ canvasContext: ctx, viewport }).promise;

    buffers[pageNum - 1] = canvas.toBuffer("image/png") as Buffer;
    page.cleanup();
  }

  await runWithConcurrency(
    Array.from({ length: totalPages }, (_, i) => () => renderPage(i + 1)),
    RENDER_CONCURRENCY,
  );

  await pdf.destroy();
  console.log(`[pdfProcessor] Rendered ${buffers.length} pages successfully`);
  return buffers;
}

/**
 * Legacy compatibility shim: render PDF pages to temp PNG files on disk.
 * Used by processingJob.ts which expects file paths.
 */
export async function renderPdfPages(
  pdfPath: string,
  _pageCount: number,
  outputDir: string,
  maxPages = 150
): Promise<string[]> {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const buffers = await renderPdfPagesToBuffers(pdfBuffer, maxPages);

  const filePaths: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const filePath = path.join(outputDir, `page-${String(i + 1).padStart(4, "0")}.png`);
    fs.writeFileSync(filePath, buffers[i]);
    filePaths.push(filePath);
  }

  return filePaths;
}

// ─── Upload rendered pages to S3 ─────────────────────────────────────────────

/**
 * Upload all rendered page images to S3 and return their public URLs.
 * URLs are used as image_url inputs to the vision API.
 */
export async function uploadPageImagesToS3(
  imagePaths: string[],
  projectId: number
): Promise<string[]> {
  const S3_CONCURRENCY = 10;
  const urls: string[] = new Array(imagePaths.length);

  await runWithConcurrency(
    imagePaths.map((imgPath, i) => async () => {
      const buffer = fs.readFileSync(imgPath);
      const randomSuffix = randomBytes(6).toString("hex");
      const key = `projects/${projectId}/pages/page-${String(i + 1).padStart(3, "0")}-${randomSuffix}.png`;
      const { url } = await storagePut(key, buffer, "image/png");
      urls[i] = url;
    }),
    S3_CONCURRENCY,
  );

  return urls;
}

// ─── Text extraction (for text-based PDFs) ───────────────────────────────────

/**
 * Extract all text from a PDF buffer using pdfjs-dist.
 * Replaces pdf-parse to avoid the version conflict.
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const pdf = await loadPdfDocument(pdfBuffer);
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim();
      if (pageText) {
        fullText += `\n\n[Page ${i}]\n${pageText}`;
      }
      page.cleanup();
    } catch {
      // skip pages that fail
    }
  }

  await pdf.destroy();
  return fullText.trim();
}

export async function extractTextChunks(
  pdfBuffer: Buffer,
  chunkSize = 800,
  overlap = 100
): Promise<string[]> {
  const text = await extractTextFromPdf(pdfBuffer);
  return chunkText(text, chunkSize, overlap);
}

export function chunkText(
  text: string,
  chunkSize = 800,
  overlap = 100
): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.length > 20);
}

// ─── ChromaDB helpers ─────────────────────────────────────────────────────────

export async function createOrGetCollection(collectionId: string) {
  const chroma = await getChromaClient();
  if (!chroma) throw new Error("ChromaDB not available");
  try {
    return await chroma.getOrCreateCollection({ name: collectionId });
  } catch {
    return await chroma.createCollection({ name: collectionId });
  }
}

export async function embedAndStore(
  collectionId: string,
  chunks: string[],
  metadatas?: Record<string, string | number>[]
): Promise<void> {
  const collection = await createOrGetCollection(collectionId);

  const batchSize = 20;
  const EMBED_CONCURRENCY = 3;
  const batchIndices: number[] = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    batchIndices.push(i);
  }

  await runWithConcurrency(
    batchIndices.map((i) => async () => {
      const batch = chunks.slice(i, i + batchSize);
      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch,
      });
      const embeddings = embeddingRes.data.map((d) => d.embedding);
      const ids = batch.map((_, j) => `chunk-${i + j}`);
      const meta = metadatas
        ? metadatas.slice(i, i + batchSize)
        : batch.map((_, j) => ({ index: i + j }));

      await collection.add({ ids, embeddings, documents: batch, metadatas: meta });
    }),
    EMBED_CONCURRENCY,
  );
}

export async function retrieveContext(
  collectionId: string,
  query: string,
  nResults = 5
): Promise<string[]> {
  try {
    const collection = await createOrGetCollection(collectionId);
    const queryEmbedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding.data[0].embedding],
      nResults,
    });
    return (results.documents[0] ?? []).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function deleteCollection(collectionId: string): Promise<void> {
  try {
    const chroma = await getChromaClient();
    if (!chroma) return;
    await chroma.deleteCollection({ name: collectionId });
  } catch {
    // ignore if not found
  }
}
