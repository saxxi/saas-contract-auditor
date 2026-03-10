import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "@/lib/webhook-auth";

const SECRET = "test-secret-key";

function sign(body: string, secret: string = SECRET): string {
  const hmac = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hmac}`;
}

describe("verifyWebhookSignature", () => {
  it("returns true for valid signature", () => {
    const body = '{"account_key":"test"}';
    const sig = sign(body);
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
  });

  it("returns false for wrong signature", () => {
    const body = '{"account_key":"test"}';
    const sig = sign("different body");
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const body = '{"account_key":"test"}';
    const sig = sign(body, "wrong-secret");
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(false);
  });

  it("returns false for missing sha256= prefix", () => {
    const body = '{"account_key":"test"}';
    const hmac = createHmac("sha256", SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body, hmac, SECRET)).toBe(false);
  });

  it("returns false for empty signature", () => {
    expect(verifyWebhookSignature("body", "", SECRET)).toBe(false);
  });

  it("returns false for truncated hex digest", () => {
    const body = '{"test": true}';
    const sig = sign(body);
    const truncated = sig.slice(0, -4);
    expect(verifyWebhookSignature(body, truncated, SECRET)).toBe(false);
  });

  it("handles empty body", () => {
    const sig = sign("");
    expect(verifyWebhookSignature("", sig, SECRET)).toBe(true);
  });
});
