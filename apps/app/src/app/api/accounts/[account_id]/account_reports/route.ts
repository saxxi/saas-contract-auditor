import { NextResponse } from "next/server";
import { createReport, createReportFromData } from "@/lib/mock-db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ account_id: string }> }
) {
  const { account_id } = await params;

  // Check if the request has a body with report data (from agent)
  const contentType = request.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const body = await request.json();
    if (body.content && body.proposition_type) {
      const report = await createReportFromData(account_id, body);
      if (!report) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      return NextResponse.json(report, { status: 201 });
    }
  }

  // Fallback: mock generation
  const report = await createReport(account_id);
  if (!report) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json(report, { status: 201 });
}
