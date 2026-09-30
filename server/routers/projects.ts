import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { manuals, projects, stepSessions, users, creditTransactions, stepFeedback } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { clarifyStep } from "../stepGenerator";
import { calcCreditCost } from "../stripeProducts";
import { notifyOwner } from "../_core/notification";
import { sendOwnerEmail } from "../_core/email";
import type { AssemblyStep } from "../stepGenerator";

export const projectsRouter = router({
  // List all projects for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.createdAt));

    return rows;
  }),

  // Get a single project (ownership enforced)
  get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
      .limit(1);

    if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    return rows[0];
  }),

  // Create a new project
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.insert(projects).values({
        userId: ctx.user.id,
        name: input.name,
        status: "new",
      });

      const insertId = (result as any).insertId ?? (result as any)[0]?.insertId;
      return { id: Number(insertId), name: input.name };
    }),

  // Delete a project (ownership enforced)
  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
      .limit(1);

    if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

    await db.delete(manuals).where(eq(manuals.projectId, input.id));
    await db.delete(stepSessions).where(eq(stepSessions.projectId, input.id));
    await db.delete(projects).where(eq(projects.id, input.id));

    return { success: true };
  }),

  // Get project status (for polling)
  status: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
      .limit(1);

    if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    const project = rows[0];

    const sessionRows = await db.select().from(stepSessions).where(eq(stepSessions.projectId, input.id)).limit(1);

    return {
      status: project.status,
      totalSteps: project.totalSteps ?? 0,
      currentStep: project.currentStep ?? 1,
      errorMessage: project.errorMessage ?? null,
      session: sessionRows[0] ?? null,
    };
  }),

  // Check if user can upload — returns credit balance and cost estimate
  canUpload: protectedProcedure
    .input(z.object({ fileSizeBytes: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const userRows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const user = userRows[0];
      const credits = user?.credits ?? 0;
      const fileSizeBytes = input?.fileSizeBytes ?? 0;
      const creditCost = calcCreditCost(fileSizeBytes);
      return {
        canUpload: credits >= creditCost,
        credits,
        creditCost,
        // Legacy field kept for compatibility
        freeManualUsed: user?.freeManualUsed ?? false,
      };
    }),

  // Get step session data
  getSession: protectedProcedure.input(z.object({ projectId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const projectRows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
      .limit(1);
    if (!projectRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

    const sessionRows = await db.select().from(stepSessions).where(eq(stepSessions.projectId, input.projectId)).limit(1);
    return sessionRows[0] ?? null;
  }),

  // Get or generate a specific step
  getStep: protectedProcedure
    .input(z.object({ projectId: z.number(), stepNumber: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const projectRows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);
      if (!projectRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const project = projectRows[0];

      if (project.status !== "ready") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Project is not ready yet" });
      }

      const sessionRows = await db.select().from(stepSessions).where(eq(stepSessions.projectId, input.projectId)).limit(1);
      if (!sessionRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "No session found" });
      const session = sessionRows[0];

      // Steps are pre-generated during processing — just return from cache
      const stepsData: AssemblyStep[] = session.stepsData ? JSON.parse(session.stepsData) : [];
      const step = stepsData.find((s) => s.step_number === input.stepNumber);

      if (!step) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Step ${input.stepNumber} not found. The manual may still be processing or encountered an error.`,
        });
      }

      // Update current step cursor
      await db.update(stepSessions).set({ currentStep: input.stepNumber }).where(eq(stepSessions.projectId, input.projectId));
      await db.update(projects).set({ currentStep: input.stepNumber }).where(eq(projects.id, input.projectId));

      return step;
    }),

  // Report a step as inaccurate — records feedback and notifies the owner
  reportInaccurate: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        stepNumber: z.number().int().min(1).max(500),
        stepTitle: z.string().max(200).optional(),
        sourcePages: z.array(z.number().int().positive().max(9999)).max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify project ownership
      const projectRows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);
      if (!projectRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const project = projectRows[0];

      // Store feedback
      await db.insert(stepFeedback).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        stepNumber: input.stepNumber,
        stepTitle: input.stepTitle ?? null,
        sourcePages: input.sourcePages ? input.sourcePages.join(",") : null,
      });

      // Notify owner
      const pageNote = input.sourcePages && input.sourcePages.length > 0
        ? ` (PDF page${input.sourcePages.length > 1 ? "s" : ""} ${input.sourcePages.join(", ")})`
        : "";
      // Send owner notification (email)
      await notifyOwner({
        title: `Inaccurate step reported — ${project.name}`,
        content: `User ${ctx.user.name ?? ctx.user.openId} flagged Step ${input.stepNumber}${pageNote} as inaccurate.\n\nStep title: "${input.stepTitle ?? "(unknown)"}"\nProject ID: ${input.projectId}`,
      });

      // Also send email to helpfromassembleai@gmail.com
      await sendOwnerEmail({
        subject: `[AssembleAI] Inaccurate step reported — ${project.name}`,
        text: [
          `A user flagged a step as inaccurate.`,
          ``,
          `Project: ${project.name} (ID: ${input.projectId})`,
          `Step: ${input.stepNumber}${pageNote}`,
          `Step title: "${input.stepTitle ?? "(unknown)"}"`,
          `Reported by: ${ctx.user.name ?? ctx.user.email ?? "unknown"}`,
          `Time: ${new Date().toUTCString()}`,
        ].join("\n"),
      });

      return { success: true };
    }),

  // Clarify current step
  clarifyStep: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      stepNumber: z.number().int().min(1).max(500),
      question: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const projectRows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)))
        .limit(1);
      if (!projectRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const sessionRows = await db.select().from(stepSessions).where(eq(stepSessions.projectId, input.projectId)).limit(1);
      if (!sessionRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "No session found" });
      const session = sessionRows[0];

      const stepsData: AssemblyStep[] = session.stepsData ? JSON.parse(session.stepsData) : [];
      const currentStep = stepsData.find((s) => s.step_number === input.stepNumber);
      if (!currentStep) throw new TRPCError({ code: "NOT_FOUND", message: "Step not found" });

      const manualRows = await db.select().from(manuals).where(eq(manuals.projectId, input.projectId)).limit(1);
      const collectionId = manualRows[0]?.chromaCollectionId ?? `project-${input.projectId}`;

      try {
        const clarified = await clarifyStep(collectionId, currentStep, input.question);
        const updatedSteps = stepsData.map((s) => (s.step_number === input.stepNumber ? clarified : s));
        await db
          .update(stepSessions)
          .set({ stepsData: JSON.stringify(updatedSteps) })
          .where(eq(stepSessions.projectId, input.projectId));
        return clarified;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "FEATURE_UNDER_DEVELOPMENT") {
          throw new TRPCError({
            code: "METHOD_NOT_SUPPORTED",
            message: "Step clarification is currently under development. It will be available in a future update.",
          });
        }
        throw err;
      }
    }),
});
