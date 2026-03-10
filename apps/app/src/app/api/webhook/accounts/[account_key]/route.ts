import { NextRequest, NextResponse } from "next/server";
import { withWebhookAuth } from "@/lib/auth-middleware";
import { deleteAccountCascade, writeAuditEvent } from "@/lib/db-queries";

/** DELETE /api/webhook/accounts/[account_key] - Delete account + cascade. See docs/api/openapi.yaml */
export const DELETE = withWebhookAuth(async (
  _req: NextRequest,
  _body: string,
  context?: { params: Promise<Record<string, string>> }
) => {
  const params = await context!.params;
  const accountKey = params.account_key;

  if (!accountKey) {
    return NextResponse.json({ error: "account_key is required" }, { status: 400 });
  }

  try {
    const deleted = await deleteAccountCascade(accountKey);

    if (!deleted) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    writeAuditEvent({
      event_type: "webhook.account.deleted",
      actor: "webhook:hmac",
      resource_type: "account",
      resource_id: accountKey,
      detail: null,
    });

    return NextResponse.json({ account_key: accountKey, deleted: true });
  } catch (err) {
    console.error("Webhook account delete failed:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
});
