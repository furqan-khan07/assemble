import express, { Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { users, creditTransactions } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { CREDIT_PACKS } from "./stripeProducts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const stripeRouter = express.Router();

// ─── Webhook (raw body required, registered BEFORE json middleware) ───────────
stripeRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Stripe Webhook] Signature verification failed:", msg);
      res.status(400).send(`Webhook Error: ${msg}`);
      return;
    }

    // ── Test event passthrough ──────────────────────────────────────────────
    if (event.id.startsWith("evt_test_")) {
      console.log("[Stripe Webhook] Test event detected, returning verification response");
      res.json({ verified: true });
      return;
    }

    console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await fulfillCreditPurchase(session);
    }

    res.json({ received: true });
  }
);

async function fulfillCreditPurchase(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
  const packId = session.metadata?.pack_id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (!userId || !packId) {
    console.error("[Stripe Webhook] Missing user_id or pack_id in metadata", session.metadata);
    return;
  }

  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    console.error("[Stripe Webhook] Unknown pack_id:", packId);
    return;
  }

  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] DB unavailable");
    return;
  }

  // Idempotency: skip if already fulfilled
  if (paymentIntentId) {
    const existing = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    if (existing.length > 0) {
      console.log("[Stripe Webhook] Already fulfilled:", paymentIntentId);
      return;
    }
  }

  // Award credits
  await db
    .update(users)
    .set({ credits: sql`credits + ${pack.credits}` })
    .where(eq(users.id, userId));

  // Record transaction
  await db.insert(creditTransactions).values({
    userId,
    credits: pack.credits,
    reason: "purchase",
    stripePaymentIntentId: paymentIntentId ?? undefined,
  });

  // Save stripe customer id if not already stored
  if (session.customer) {
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId));
  }

  console.log(`[Stripe Webhook] Fulfilled ${pack.credits} credits for user ${userId}`);
}
