import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, creditTransactions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { CREDIT_PACKS } from "../stripeProducts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const creditsRouter = router({
  // Get current user's credit balance
  balance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const result = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    return { credits: result[0]?.credits ?? 0 };
  }),

  // List available credit packs
  packs: protectedProcedure.query(() => {
    return CREDIT_PACKS;
  }),

  // Create a Stripe Checkout session for a credit pack
  createCheckout: protectedProcedure
    .input(z.object({ packId: z.string(), origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const pack = CREDIT_PACKS.find((p) => p.id === input.packId);
      if (!pack) throw new Error("Invalid pack");

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: pack.priceCents,
              product_data: {
                name: `AssembleAI — ${pack.label} Pack (${pack.credits} credit${pack.credits > 1 ? "s" : ""})`,
                description: `${pack.credits} credit${pack.credits > 1 ? "s" : ""} for processing assembly manuals`,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: ctx.user.email ?? undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          pack_id: pack.id,
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
        },
        allow_promotion_codes: true,
        success_url: `${input.origin}/app?payment=success`,
        cancel_url: `${input.origin}/pricing?payment=cancelled`,
      });

      return { url: session.url };
    }),

  // Transaction history
  history: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, ctx.user.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(50);
    return rows;
  }),
});
