import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 256 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  freeManualUsed: boolean("freeManualUsed").default(false).notNull(),
  // Credits system
  credits: int("credits").default(0).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  verificationToken: varchar("verificationToken", { length: 128 }).unique(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// AssembleAI tables
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  status: mysqlEnum("status", ["new", "processing", "ready", "failed"]).default("new").notNull(),
  totalSteps: int("totalSteps").default(0),
  currentStep: int("currentStep").default(0),
  creditsCost: int("creditsCost").default(1).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const manuals = mysqlTable("manuals", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  filename: varchar("filename", { length: 512 }).notNull(),
  s3Key: varchar("s3Key", { length: 512 }).notNull(),
  s3Url: text("s3Url"),
  pageCount: int("pageCount").default(0),
  fileSizeBytes: int("fileSizeBytes").default(0),
  isImageOnly: boolean("isImageOnly").default(false),
  extractedTextPath: text("extractedTextPath"),
  chromaCollectionId: varchar("chromaCollectionId", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const stepSessions = mysqlTable("stepSessions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  currentStep: int("currentStep").default(1).notNull(),
  totalSteps: int("totalSteps").default(0).notNull(),
  stepsData: text("stepsData"), // JSON array of generated steps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Credit transactions — one row per purchase fulfillment or spend event
export const creditTransactions = mysqlTable("creditTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  credits: int("credits").notNull(),            // positive = awarded, negative = spent
  reason: varchar("reason", { length: 128 }).notNull(), // 'purchase' | 'spend' | 'refund'
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  projectId: int("projectId"),                  // set when reason = 'spend'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Step accuracy feedback — submitted when a user flags a step as inaccurate
export const stepFeedback = mysqlTable("stepFeedback", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  stepNumber: int("stepNumber").notNull(),
  stepTitle: varchar("stepTitle", { length: 512 }),
  sourcePages: varchar("sourcePages", { length: 128 }), // e.g. "3,4"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StepFeedback = typeof stepFeedback.$inferSelect;
export type InsertStepFeedback = typeof stepFeedback.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Manual = typeof manuals.$inferSelect;
export type InsertManual = typeof manuals.$inferInsert;
export type StepSession = typeof stepSessions.$inferSelect;
export type InsertStepSession = typeof stepSessions.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;
