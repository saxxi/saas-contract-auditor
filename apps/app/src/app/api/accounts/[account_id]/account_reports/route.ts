import { NextResponse } from "next/server";
import { z } from "zod";
import { createReport, createReportFromData } from "@/lib/db-queries";

const reportBodySchema = z.object({
  content: z.string().min(1),
  proposition_type: z.string().min(1),
  strategic_bucket: z.string().optional(),
  success_percent: z.number().int().min(0).max(100),
  intervene: z.boolean(),
  priority_score: z.number().int().min(1).max(10).optional(),
  score_rationale: z.string().optional(),
});

/** POST /api/accounts/:account_id/account_reports - Create a report for a single account. See docs/api/openapi.yaml */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ account_id: string }> }
) {
  const { account_id } = await params;

  // Check if the request has a body with report data (from agent)
  const contentType = request.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const body = await request.json();
    const parsed = reportBodySchema.safeParse(body);
    if (parsed.success) {
      const report = await createReportFromData(account_id, parsed.data);
      if (!report) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      return NextResponse.json(report, { status: 201 });
    }
    // If JSON but doesn't match schema, check if it has basic fields for partial match
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
