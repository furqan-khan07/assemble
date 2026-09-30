import { describe, it, expect, vi } from "vitest";

// We test that sendOwnerEmail gracefully handles missing credentials
// without actually sending a real email in CI.
describe("sendOwnerEmail", () => {
  it("returns false and logs a warning when GMAIL_APP_PASSWORD is not set", async () => {
    const original = process.env.GMAIL_APP_PASSWORD;
    delete process.env.GMAIL_APP_PASSWORD;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { sendOwnerEmail } = await import("./_core/email");
    const result = await sendOwnerEmail({ subject: "Test", text: "Test body" });

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("GMAIL_APP_PASSWORD not set")
    );

    warnSpy.mockRestore();
    if (original !== undefined) process.env.GMAIL_APP_PASSWORD = original;
  });

  it("module exports sendOwnerEmail as a function", async () => {
    const mod = await import("./_core/email");
    expect(typeof mod.sendOwnerEmail).toBe("function");
  });
});
