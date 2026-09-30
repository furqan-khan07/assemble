import { describe, it, expect } from "vitest";
import { calcCreditCost, CREDIT_PACKS } from "./stripeProducts";

const MB = 1024 * 1024;

describe("calcCreditCost — 10 credits per MB, rounded up, minimum 10", () => {
  it("charges 10 credits for a 0-byte file (minimum)", () => {
    expect(calcCreditCost(0)).toBe(10);
  });

  it("charges 10 credits for a 500 KB file (< 1 MB, rounds up to 1)", () => {
    expect(calcCreditCost(0.5 * MB)).toBe(10);
  });

  it("charges 10 credits for exactly 1 MB", () => {
    expect(calcCreditCost(1 * MB)).toBe(10);
  });

  it("charges 20 credits for 1.1 MB (rounds up)", () => {
    expect(calcCreditCost(1.1 * MB)).toBe(20);
  });

  it("charges 40 credits for exactly 4 MB", () => {
    expect(calcCreditCost(4 * MB)).toBe(40);
  });

  it("charges 50 credits for exactly 5 MB", () => {
    expect(calcCreditCost(5 * MB)).toBe(50);
  });

  it("charges 60 credits for 5.1 MB (rounds up)", () => {
    expect(calcCreditCost(5.1 * MB)).toBe(60);
  });

  it("charges 100 credits for exactly 10 MB", () => {
    expect(calcCreditCost(10 * MB)).toBe(100);
  });

  it("charges 110 credits for 10.5 MB (rounds up)", () => {
    expect(calcCreditCost(10.5 * MB)).toBe(110);
  });

  it("charges 200 credits for exactly 20 MB", () => {
    expect(calcCreditCost(20 * MB)).toBe(200);
  });
});

describe("CREDIT_PACKS", () => {
  it("has exactly 5 packs (including hidden Studio pack)", () => {
    expect(CREDIT_PACKS).toHaveLength(5);
  });

  it("pack_1 costs $4.29 for 100 credits", () => {
    const pack = CREDIT_PACKS.find((p) => p.id === "pack_1");
    expect(pack).toBeDefined();
    expect(pack!.credits).toBe(100);
    expect(pack!.priceCents).toBe(429);
  });

  it("pack_3 costs $11.29 for 300 credits", () => {
    const pack = CREDIT_PACKS.find((p) => p.id === "pack_3");
    expect(pack).toBeDefined();
    expect(pack!.credits).toBe(300);
    expect(pack!.priceCents).toBe(1129);
  });

  it("pack_5 costs $17.29 for 500 credits and has Popular badge", () => {
    const pack = CREDIT_PACKS.find((p) => p.id === "pack_5");
    expect(pack).toBeDefined();
    expect(pack!.credits).toBe(500);
    expect(pack!.priceCents).toBe(1729);
    expect(pack!.badge).toBe("Popular");
  });

  it("pack_10 costs $32.29 for 1000 credits and has Best Value badge", () => {
    const pack = CREDIT_PACKS.find((p) => p.id === "pack_10");
    expect(pack).toBeDefined();
    expect(pack!.credits).toBe(1000);
    expect(pack!.priceCents).toBe(3229);
    expect(pack!.badge).toBe("Best Value");
  });

  it("pack_100 costs $247.47 for 10000 credits and is hidden", () => {
    const pack = CREDIT_PACKS.find((p) => p.id === "pack_100");
    expect(pack).toBeDefined();
    expect(pack!.credits).toBe(10000);
    expect(pack!.priceCents).toBe(24747);
    expect(pack!.hidden).toBe(true);
  });

  it("each visible pack has a per-credit cost that decreases as pack size increases", () => {
    const visible = CREDIT_PACKS.filter((p) => !p.hidden).sort((a, b) => a.credits - b.credits);
    for (let i = 1; i < visible.length; i++) {
      expect(visible[i]!.perCreditCents).toBeLessThanOrEqual(visible[i - 1]!.perCreditCents);
    }
  });

  it("all packs have required fields", () => {
    for (const pack of CREDIT_PACKS) {
      expect(pack.id).toBeTruthy();
      expect(pack.credits).toBeGreaterThan(0);
      expect(pack.priceCents).toBeGreaterThan(0);
      expect(pack.label).toBeTruthy();
    }
  });
});
