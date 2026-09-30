import { describe, expect, it } from "vitest";

describe("OpenAI API key validation", () => {
  it("OPENAI_API_KEY env var is set", () => {
    const key = process.env.OPENAI_API_KEY;
    expect(key).toBeTruthy();
    expect(key?.startsWith("sk-")).toBe(true);
  });
});
