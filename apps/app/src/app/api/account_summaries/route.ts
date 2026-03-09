import { NextRequest, NextResponse } from "next/server";
import { getAccountSummaries } from "@/lib/db-queries";

/** GET /api/account_summaries - Get account summaries with usage metrics and budget. See docs/api/openapi.yaml */
export async function GET(request: NextRequest) {
  const accountIds = request.nextUrl.searchParams.get("account_ids");
  if (!accountIds) {
    return NextResponse.json({ error: "account_ids query parameter is required" }, { status: 400 });
  }
  const ids = accountIds.split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: "account_ids must contain at least one non-empty ID" }, { status: 400 });
  }
  try {
    const summaries = await getAccountSummaries(ids);
    return NextResponse.json(summaries);
  } catch (err) {
    console.error("Failed to fetch account summaries:", err);
    return NextResponse.json({ error: "Failed to fetch account summaries" }, { status: 500 });
  }
}
