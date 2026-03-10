import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_HEADER = "x-webhook-signature";
const SIGNATURE_PREFIX = "sha256=";

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  if (!signature.startsWith(SIGNATURE_PREFIX)) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const received = signature.slice(SIGNATURE_PREFIX.length);

  if (expected.length !== received.length) return false;

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function getSignatureHeader(headers: Headers): string | null {
  return headers.get(SIGNATURE_HEADER);
}

export { SIGNATURE_HEADER, SIGNATURE_PREFIX };
