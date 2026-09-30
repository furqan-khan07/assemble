import OpenAI from "openai";
import { retrieveContext, runWithConcurrency } from "./pdfProcessor";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const API_CONCURRENCY = 3;

export type { AssemblyStep } from "../shared/assemblyTypes";
import type { AssemblyStep } from "../shared/assemblyTypes";

// ─── JSON Schemas ─────────────────────────────────────────────────────────────

const STEP_ITEM_SCHEMA = {
  type: "object",
  properties: {
    step_number: { type: "integer" },
    title: { type: "string" },
    tools_needed: { type: "array", items: { type: "string" } },
    parts_needed: { type: "array", items: { type: "string" } },
    substeps: { type: "array", items: { type: "string" } },
    check: { type: "string" },
    warning: { type: "string" },
    source_pages: { type: "array", items: { type: "integer" } },
  },
  required: ["step_number", "title", "tools_needed", "parts_needed", "substeps", "check", "warning", "source_pages"],
  additionalProperties: false,
};

const ALL_STEPS_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "assembly_steps_list",
    strict: true,
    schema: {
      type: "object",
      properties: {
        steps: { type: "array", items: STEP_ITEM_SCHEMA },
      },
      required: ["steps"],
      additionalProperties: false,
    },
  },
};

// ─── System prompts ───────────────────────────────────────────────────────────

function buildSystemPrompt(projectName: string, totalPages: number): string {
  return `You are an expert assembly technician and technical writer analysing the "${projectName}" instruction manual.

You will receive the ACTUAL pages of the manual as images. Your job is to generate a complete, sequential, highly detailed set of assembly steps that a real person can follow without ever looking at the original manual.

═══ CORE PRINCIPLES ═══

1. LITERAL ACCURACY — Only describe what is LITERALLY VISIBLE in the images. Never invent parts, tools, actions, or quantities not shown.

2. MAXIMUM SPECIFICITY — Vague instructions are useless. Every substep must answer: WHAT part (with exact label/code), WHERE it goes, HOW it attaches, WHICH DIRECTION it faces, and HOW TIGHT/FAR it goes.

3. COMPLETE COVERAGE — Cover ALL ${totalPages} pages. Do not skip any content, even if it seems like a parts list, cover page, or overview — these are introductory steps.

═══ STEP STRUCTURE RULES ═══

TITLE: Be specific and action-oriented. Name the actual part and action.
  ✓ GOOD: "Insert cam lock nuts into pre-drilled holes on left side panel"
  ✗ BAD: "Attach parts" / "Assembly step 3"

SUBSTEPS (5–8 per step, each must be a complete, actionable sentence):
  - Start with an action verb (Insert, Align, Tighten, Slide, Flip, Press, Thread, etc.)
  - Name the EXACT part as labelled in the manual, including part codes if visible (e.g. "Part A — long side panel (×2)", "Cam lock nut — silver cylinder, ×8")
  - Include quantity when multiple identical parts are used (e.g. "Insert all 4 cam lock nuts")
  - Describe orientation using compass/clock directions or anatomical references visible in the diagram (e.g. "notch facing downward", "arrow pointing toward the back of the unit", "threaded end facing outward")
  - Mention the tool shown and how to use it (e.g. "Using the included Allen key, turn clockwise until resistance is felt — do not overtighten")
  - If a diagram shows a close-up or callout box, describe what it highlights
  - If a step involves multiple identical operations (e.g. attaching 4 legs), say so explicitly: "Repeat for all 4 legs"

PARTS_NEEDED: List ONLY parts visible in THIS step's pages. Include:
  - Exact part label/code as printed (e.g. "Part A", "Cam lock nut", "×117662")
  - Quantity (e.g. "2×", "4×")
  - Brief description if helpful (e.g. "long side panel with pre-drilled holes")

TOOLS_NEEDED: List ONLY tools shown in THIS step's pages. Include the tool name and any relevant detail (e.g. "Allen key — 4mm, included in box").

CHECK: Describe exactly what the completed assembly should look like after this step, based on the final diagram shown. Be specific about alignment, gaps, flush surfaces, etc. (e.g. "Both side panels should stand upright with the cam lock nuts flush with the surface and the notches aligned. No gaps should be visible at the joint.")

WARNING: Include ONLY if a warning symbol, caution triangle, or explicit caution text is VISIBLE in the images. Describe the actual hazard shown (e.g. "Caution: Do not overtighten the cam lock nuts — the manual shows a cracked panel as a warning"). Use "" if no warning is visible.

SOURCE_PAGES: List the 1-indexed absolute page numbers (in the full document) that this step is based on. Be precise.

═══ SPECIAL CASES ═══

- Parts list pages: Create a step titled "Identify and sort your parts" listing all parts shown with quantities and descriptions.
- Cover/overview pages: Create a brief introductory step describing what the finished product looks like and what tools are included.
- Image-only diagrams: Describe exactly what the diagram shows, including arrows, dotted lines, and callout boxes.
- Exploded diagrams: Describe the assembly order shown by the explosion direction and any numbered callouts.
- If a page shows a warning or safety notice: Create a dedicated safety step.`;
}

function buildVerificationPrompt(projectName: string, totalPages: number): string {
  return `You are a meticulous quality inspector reviewing assembly instructions for "${projectName}".

You will receive the SAME manual pages as images, plus a DRAFT set of assembly steps.

Your job is to produce the FINAL, CORRECTED version of the steps. Apply every rule below without exception.

═══ HALLUCINATION REMOVAL (CRITICAL) ═══
- Remove any part name, part code, or quantity NOT VISIBLE in the provided images
- Remove any tool NOT SHOWN in the images
- Remove any substep describing an action not depicted in any image
- Remove any warning not backed by a visible warning symbol or caution text
- If a substep references "Part X" but no such label appears — remove or correct it
- If a quantity is wrong (e.g. says ×4 but diagram shows ×6) — correct it

═══ ACCURACY IMPROVEMENTS ═══
- Correct all part labels to match EXACTLY what is printed in the images (including codes, letters, numbers)
- Correct all quantities to match exactly what is shown — count them in the diagram
- Correct orientation descriptions to match the arrows, dotted lines, and diagrams shown
- If a substep is vague (e.g. "attach the piece"), make it specific based on what the image shows
- If a step is missing content that IS clearly visible in the images — add it
- If a diagram shows a close-up or callout — make sure it is described in the substeps

═══ HELPFULNESS IMPROVEMENTS ═══
- Ensure every substep starts with an action verb
- Ensure part quantities are stated explicitly when multiple identical parts are used
- Ensure the CHECK field describes the completed state specifically (not just "it should look right")
- If a step has fewer than 5 substeps and the images clearly show more detail — expand it
- If a step has more than 8 substeps — consider whether it should be split into two steps

═══ PAGE CITATION ═══
- Verify and correct source_pages for each step — must list the actual 1-indexed absolute page numbers
- If a step spans multiple pages, list all of them

═══ STRUCTURE RULES ═══
- Keep ALL ${totalPages} pages covered — do not drop steps that correspond to real manual content
- Maintain sequential step numbering
- Do not merge steps that cover clearly different manual pages
- Return the corrected, verified step list. If a step is correct as-is, return it unchanged.`;
}

// ─── Generate all steps from page images (primary pipeline) ──────────────────

/**
 * PASS 1: Generate detailed initial steps from page images.
 * PASS 2: Strict verification — remove hallucinations, correct labels/quantities, improve detail.
 */
export async function generateAllStepsFromImages(
  pageImageUrls: string[],
  projectName: string
): Promise<AssemblyStep[]> {
  const BATCH_SIZE = 20;
  const totalPages = pageImageUrls.length;

  const batches: string[][] = [];
  for (let i = 0; i < pageImageUrls.length; i += BATCH_SIZE) {
    batches.push(pageImageUrls.slice(i, i + BATCH_SIZE));
  }

  type ImageBlock = { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } };
  type TextBlock = { type: "text"; text: string };
  type ContentBlock = ImageBlock | TextBlock;

  // ── PASS 1: Generate (parallel batches) ───────────────────────────────────
  console.log(`[StepGenerator] PASS 1 — generating steps from ${batches.length} batch(es) with concurrency ${API_CONCURRENCY}...`);

  const batchResults: AssemblyStep[][] = await runWithConcurrency(
    batches.map((batch, batchIdx) => async () => {
      const batchStart = batchIdx * BATCH_SIZE + 1;
      const batchEnd = batchStart + batch.length - 1;
      const isLastBatch = batchIdx === batches.length - 1;

      console.log(`[StepGenerator] PASS 1 — pages ${batchStart}–${batchEnd} of ${totalPages} (batch ${batchIdx + 1}/${batches.length})...`);

      const imageBlocks: ContentBlock[] = batch.map((url) => ({
        type: "image_url" as const,
        image_url: { url, detail: "high" as const },
      }));

      const instructionText: ContentBlock = {
        type: "text",
        text: `These are pages ${batchStart} to ${batchEnd} of the "${projectName}" assembly manual (${totalPages} pages total).

${!isLastBatch
  ? `This is NOT the last batch — there are more pages after page ${batchEnd}. Generate steps for ONLY these pages.`
  : `This is the LAST batch. Generate steps to complete the full assembly.`}

IMPORTANT: For source_pages, use the ABSOLUTE page numbers in the full document (${batchStart}–${batchEnd}), not relative positions within this batch.

Generate detailed, complete assembly steps for ONLY the pages shown above. Number them starting from 1 (they will be re-numbered later).

Remember: every substep must be specific enough that someone could follow it without looking at the original manual. Name exact parts, quantities, orientations, and tools.`,
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 16000,
        response_format: ALL_STEPS_SCHEMA,
        messages: [
          { role: "system", content: buildSystemPrompt(projectName, totalPages) },
          { role: "user", content: [...imageBlocks, instructionText] },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error(`No response from OpenAI for batch ${batchIdx + 1}`);

      const parsed = JSON.parse(content) as { steps: AssemblyStep[] };
      const batchSteps = parsed.steps ?? [];

      if (batchSteps.length === 0 && batchIdx === 0) {
        throw new Error("OpenAI returned no steps for this manual. The PDF may not contain assembly instructions.");
      }

      // Clamp source_pages to valid range for this batch
      return batchSteps.map((s) => ({
        ...s,
        source_pages: (s.source_pages ?? []).filter((p) => p >= batchStart && p <= batchEnd),
      }));
    }),
    API_CONCURRENCY,
  );

  // Flatten and re-number sequentially across all batches (preserving batch order)
  const allSteps: AssemblyStep[] = [];
  for (const batchSteps of batchResults) {
    for (const step of batchSteps) {
      allSteps.push({ ...step, step_number: allSteps.length + 1 });
    }
  }

  if (allSteps.length === 0) {
    throw new Error("No steps could be generated from this manual.");
  }

  console.log(`[StepGenerator] PASS 1 complete — ${allSteps.length} steps generated. Starting PASS 2 (verification)...`);

  // ── PASS 2: Strict Verification (parallel batches) ────────────────────────
  const verifiedBatchResults: AssemblyStep[][] = await runWithConcurrency(
    batches.map((batch, batchIdx) => async () => {
      const batchStart = batchIdx * BATCH_SIZE + 1;
      const batchEnd = batchStart + batch.length - 1;

      // Find draft steps that belong to this batch
      const draftForBatch = allSteps.filter((s) => {
        if (s.source_pages && s.source_pages.length > 0) {
          return s.source_pages.some((p) => p >= batchStart && p <= batchEnd);
        }
        // Fallback: proportional estimate
        const stepFraction = (s.step_number - 1) / allSteps.length;
        const pageFraction = (batchStart - 1) / totalPages;
        const pageEndFraction = batchEnd / totalPages;
        return stepFraction >= pageFraction && stepFraction < pageEndFraction;
      });

      if (draftForBatch.length === 0) {
        console.log(`[StepGenerator] PASS 2 — skipping batch ${batchIdx + 1} (no steps mapped to pages ${batchStart}–${batchEnd})`);
        return [];
      }

      console.log(`[StepGenerator] PASS 2 — verifying ${draftForBatch.length} steps against pages ${batchStart}–${batchEnd}...`);

      const imageBlocks: ContentBlock[] = batch.map((url) => ({
        type: "image_url" as const,
        image_url: { url, detail: "high" as const },
      }));

      const verifyText: ContentBlock = {
        type: "text",
        text: `These are pages ${batchStart}–${batchEnd} of the "${projectName}" manual (absolute page numbers in the full document).

Here are the DRAFT assembly steps generated from these pages:
${JSON.stringify(draftForBatch, null, 2)}

Review each step against the images above. Apply all rules from your system prompt:
1. Remove hallucinated parts, tools, quantities, and warnings not visible in the images
2. Correct all part labels, codes, and quantities to match exactly what is shown
3. Improve vague substeps to be specific and actionable based on what the images show
4. Verify and correct source_pages to use absolute page numbers (${batchStart}–${batchEnd})
5. Expand any step with fewer than 5 substeps if the images clearly show more detail
6. Ensure every CHECK field specifically describes the completed state

Return the corrected, verified steps. If a step is already accurate and detailed, return it unchanged.`,
      };

      try {
        const verifyResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 16000,
          response_format: ALL_STEPS_SCHEMA,
          messages: [
            { role: "system", content: buildVerificationPrompt(projectName, totalPages) },
            { role: "user", content: [...imageBlocks, verifyText] },
          ],
        });

        const verifyContent = verifyResponse.choices[0]?.message?.content;
        if (verifyContent) {
          const verifyParsed = JSON.parse(verifyContent) as { steps: AssemblyStep[] };
          const correctedSteps = verifyParsed.steps ?? [];
          if (correctedSteps.length > 0) {
            const clamped = correctedSteps.map((s) => ({
              ...s,
              source_pages: (s.source_pages ?? []).filter((p) => p >= batchStart && p <= batchEnd),
            }));
            console.log(`[StepGenerator] PASS 2 — batch ${batchIdx + 1}: ${clamped.length} steps verified/corrected`);
            return clamped;
          }
        }
        return draftForBatch;
      } catch (verifyErr) {
        console.warn(`[StepGenerator] PASS 2 verification failed for batch ${batchIdx + 1}, keeping original steps:`, verifyErr);
        return draftForBatch;
      }
    }),
    API_CONCURRENCY,
  );

  // Flatten verified results and re-number sequentially
  const verifiedSteps: AssemblyStep[] = [];
  for (const batchSteps of verifiedBatchResults) {
    verifiedSteps.push(...batchSteps);
  }

  // Use verified steps if available, otherwise fall back to pass 1
  const finalSteps = verifiedSteps.length > 0 ? verifiedSteps : allSteps;

  // Re-number sequentially to fix any gaps
  const renumbered = finalSteps.map((s, i) => ({ ...s, step_number: i + 1 }));

  console.log(`[StepGenerator] PASS 2 complete — ${renumbered.length} final steps after verification.`);
  return renumbered;
}

/**
 * Generate all steps from ordered text chunks (fallback for text-heavy PDFs).
 */
export async function generateAllStepsFromText(
  orderedChunks: string[],
  projectName: string,
  pageCount: number
): Promise<AssemblyStep[]> {
  const MAX_CHUNKS = 40;
  const usedChunks = orderedChunks.slice(0, MAX_CHUNKS);
  const contextText = usedChunks.join("\n\n---\n\n");
  const estimatedSteps = Math.max(4, Math.min(20, Math.round(pageCount * 0.6)));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16000,
    response_format: ALL_STEPS_SCHEMA,
    messages: [
      {
        role: "system",
        content: `You are an expert assembly technician converting raw manual text into clear, detailed, step-by-step assembly instructions for "${projectName}".

Generate approximately ${estimatedSteps} steps. Each step must be specific, actionable, and complete enough that someone could follow it without seeing the original manual.

For each step:
- Title: specific action + part name (e.g. "Insert cam lock nuts into left side panel")
- Substeps (5–8): start with action verb, name exact parts with quantities, describe orientation and tool use
- Parts: exact names and quantities visible in this step
- Tools: exact tool names shown
- Check: specific description of what the completed step looks like
- Warning: only if a warning is explicitly stated in the text, otherwise ""
- Source_pages: estimated page numbers based on text position`,
      },
      {
        role: "user",
        content: `Here is the extracted text from the "${projectName}" manual (${pageCount} pages):\n\n${contextText}\n\nGenerate complete, detailed assembly steps from this content.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI for text-based generation");

  const parsed = JSON.parse(content) as { steps: AssemblyStep[] };
  return (parsed.steps ?? []).map((s, i) => ({ ...s, step_number: i + 1 }));
}

/**
 * Clarify a specific assembly step with a user question.
 * @deprecated Feature under development — throws a user-facing error.
 */
export async function clarifyStep(
  _collectionId: string,
  _step: AssemblyStep,
  _question: string
): Promise<AssemblyStep> {
  throw new Error("FEATURE_UNDER_DEVELOPMENT");
}
