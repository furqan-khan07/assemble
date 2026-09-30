import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as db from "../db";
import { creditTransactions, users } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { authService } from "./auth";
import { sendVerificationEmail } from "./email";

export function registerAuthRoutes(app: Express) {
  // ── Register ────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Check if user already exists
      const existing = await db.getUserByEmail(normalizedEmail);
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }

      const passwordHash = await authService.hashPassword(password);
      const openId = nanoid(32);
      const verificationToken = nanoid(48);

      const dbConn = await db.getDb();
      if (!dbConn) {
        res.status(500).json({ error: "Database not available" });
        return;
      }

      await dbConn.insert(users).values({
        openId,
        name: name?.trim() || null,
        email: normalizedEmail,
        passwordHash,
        loginMethod: "email",
        lastSignedIn: new Date(),
        emailVerified: false,
        verificationToken,
      });

      const user = await db.getUserByEmail(normalizedEmail);
      if (!user) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      // Award 10 free welcome credits to new users
      try {
        if (user.credits === 0) {
          await dbConn
            .update(users)
            .set({ credits: sql`credits + 10` })
            .where(sql`${users.id} = ${user.id}`);
          await dbConn.insert(creditTransactions).values({
            userId: user.id,
            credits: 10,
            reason: "welcome",
          });
          console.log(`[Auth] Awarded 10 welcome credits to new user ${user.id}`);
        }
      } catch (err) {
        console.error("[Auth] Failed to award welcome credit:", err);
      }

      // Send verification email (don't block registration if it fails)
      sendVerificationEmail({ to: normalizedEmail, token: verificationToken }).catch((err) => {
        console.error("[Auth] Failed to send verification email:", err);
      });

      res.json({ success: true, needsVerification: true });
    } catch (error) {
      console.error("[Auth] Registration failed:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Verify Email ────────────────────────────────────────────────────────
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      res.redirect("/login?error=invalid-token");
      return;
    }

    try {
      const user = await db.getUserByVerificationToken(token);
      if (!user) {
        res.redirect("/login?error=invalid-token");
        return;
      }

      if (user.emailVerified) {
        res.redirect("/login?verified=already");
        return;
      }

      const dbConn = await db.getDb();
      if (!dbConn) {
        res.redirect("/login?error=server-error");
        return;
      }

      // Mark email as verified and clear the token
      await dbConn
        .update(users)
        .set({ emailVerified: true, verificationToken: null })
        .where(sql`${users.id} = ${user.id}`);

      console.log(`[Auth] Email verified for user ${user.id}`);

      // Auto-login after verification
      const sessionToken = await authService.createSessionToken({
        userId: user.id,
        email: user.email!,
        name: user.name || "",
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect("/app?welcome=1&verified=1");
    } catch (error) {
      console.error("[Auth] Email verification failed:", error);
      res.redirect("/login?error=server-error");
    }
  });

  // ── Resend Verification Email ───────────────────────────────────────────
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    const { email } = req.body ?? {};

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const user = await db.getUserByEmail(normalizedEmail);
      if (!user || user.emailVerified) {
        // Don't reveal whether the email exists
        res.json({ success: true });
        return;
      }

      // Generate a fresh token
      const newToken = nanoid(48);
      const dbConn = await db.getDb();
      if (dbConn) {
        await dbConn
          .update(users)
          .set({ verificationToken: newToken })
          .where(sql`${users.id} = ${user.id}`);
      }

      await sendVerificationEmail({ to: normalizedEmail, token: newToken });

      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Resend verification failed:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // ── Login ───────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const user = await db.getUserByEmail(normalizedEmail);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const valid = await authService.verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Block login if email is not verified
      if (!user.emailVerified) {
        res.status(403).json({
          error: "Please verify your email before signing in. Check your inbox for a verification link.",
          needsVerification: true,
          email: normalizedEmail,
        });
        return;
      }

      // Update last signed in
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      const sessionToken = await authService.createSessionToken({
        userId: user.id,
        email: user.email!,
        name: user.name || "",
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, redirect: "/app" });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
}
