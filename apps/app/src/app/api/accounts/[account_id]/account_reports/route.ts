import { NextResponse } from "next/server";
import { createReport } from "@/lib/mock-db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ account_id: string }> }
) {
  const { account_id } = await params;
  const report = await createReport(account_id);
  if (!report) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json(report, { status: 201 });
}
