import { NextResponse } from "next/server";
import { createReports } from "@/lib/mock-db";

export async function POST(request: Request) {
  const body = await request.json();
  const accountIds: string[] = body.account_ids;
  if (!Array.isArray(accountIds)) {
    return NextResponse.json({ error: "account_ids must be an array" }, { status: 400 });
  }
  if (accountIds.length > 5) {
    return NextResponse.json({ error: "Maximum 5 account_ids per request" }, { status: 400 });
  }
  const reports = await createReports(accountIds);
  return NextResponse.json(reports, { status: 201 });
}
