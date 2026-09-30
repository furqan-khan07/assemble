/**
 * AssembleAI credit pack definitions.
 * Prices are in USD cents for Stripe.
 * Keep this file in sync with the pricing page on the frontend.
 */

export interface CreditPack {
  id: string;
  credits: number;
  priceUsd: number;   // display price in dollars
  priceCents: number; // Stripe amount in cents
  label: string;
  badge?: string;     // e.g. "Best Value"
  perCreditCents: number;
  hidden?: boolean;   // if true, don't show on the pricing page
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack_1",
    credits: 100,
    priceUsd: 4.29,
    priceCents: 429,
    label: "Starter",
    perCreditCents: Math.round(429 / 100),
  },
  {
    id: "pack_3",
    credits: 300,
    priceUsd: 11.29,
    priceCents: 1129,
    label: "Builder",
    perCreditCents: Math.round(1129 / 300),
  },
  {
    id: "pack_5",
    credits: 500,
    priceUsd: 17.29,
    priceCents: 1729,
    label: "Maker",
    badge: "Popular",
    perCreditCents: Math.round(1729 / 500),
  },
  {
    id: "pack_10",
    credits: 1000,
    priceUsd: 32.29,
    priceCents: 3229,
    label: "Workshop",
    badge: "Best Value",
    perCreditCents: Math.round(3229 / 1000),
  },
  {
    id: "pack_100",
    credits: 10000,
    priceUsd: 247.47,
    priceCents: 24747,
    label: "Studio",
    badge: "Max Savings",
    perCreditCents: Math.round(24747 / 10000),
    hidden: true, // Not displayed on pricing page — available internally only
  },
];

/**
 * Calculate how many credits a manual upload costs.
 * 10 credits per MB, rounded up. Minimum 10 credits.
 * Examples: 500 KB → 10 credits, 1.1 MB → 20 credits, 4.0 MB → 40 credits, 10.5 MB → 110 credits.
 */
export function calcCreditCost(fileSizeBytes: number): number {
  if (fileSizeBytes <= 0) return 10;
  const MB = 1024 * 1024;
  return Math.max(10, Math.ceil(fileSizeBytes / MB) * 10);
}
