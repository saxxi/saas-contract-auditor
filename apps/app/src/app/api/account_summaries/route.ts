import { NextRequest, NextResponse } from "next/server";
import { getAccountSummaries } from "@/lib/mock-db";

export async function GET(request: NextRequest) {
  const accountIds = request.nextUrl.searchParams.get("account_ids");
  if (!accountIds) {
    return NextResponse.json({ error: "account_ids query parameter is required" }, { status: 400 });
  }
  const ids = accountIds.split(",").map((id) => id.trim()).filter(Boolean);
  const summaries = await getAccountSummaries(ids);
  return NextResponse.json(summaries);
}
