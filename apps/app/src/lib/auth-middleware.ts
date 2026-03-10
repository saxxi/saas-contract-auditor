import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, getSignatureHeader } from "./webhook-auth";

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

type AuthenticatedHandler = (
  req: NextRequest,
  body: string,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withWebhookAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }): Promise<NextResponse> => {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      console.error("WEBHOOK_SECRET is not configured; rejecting all webhook requests");
      return NextResponse.json({ error: "Webhook authentication not configured" }, { status: 503 });
    }

    const signature = getSignatureHeader(req.headers);
    if (!signature) {
      return NextResponse.json({ error: "Missing X-Webhook-Signature header" }, { status: 401 });
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large (max 1MB)" }, { status: 413 });
    }

    let body: string;
    try {
      body = await req.text();
    } catch {
      return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
    }

    if (body.length > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request body too large (max 1MB)" }, { status: 413 });
    }

    if (!verifyWebhookSignature(body, signature, secret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 403 });
    }

    return handler(req, body, context);
  };
}
