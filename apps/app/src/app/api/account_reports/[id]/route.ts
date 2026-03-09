import { NextResponse } from "next/server";
import { z } from "zod";
import { getReport, updateReportContent } from "@/lib/db-queries";

const updateBodySchema = z.object({
  content: z.string().min(1),
  proposition_type: z.string().optional(),
  strategic_bucket: z.string().optional(),
  success_percent: z.number().int().min(0).max(100).optional(),
  intervene: z.boolean().optional(),
  priority_score: z.number().int().min(1).max(10).optional(),
  score_rationale: z.string().optional(),
});

/** GET /api/account_reports/:id - Get the latest report by account ID. See docs/api/openapi.yaml */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(report);
}

/** PUT /api/account_reports/:id - Update report content and optional metadata. See docs/api/openapi.yaml */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const parsed = updateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { content, ...rest } = parsed.data;
  const metadata = rest.proposition_type
    ? { proposition_type: rest.proposition_type, strategic_bucket: rest.strategic_bucket, success_percent: rest.success_percent, intervene: rest.intervene, priority_score: rest.priority_score, score_rationale: rest.score_rationale }
    : undefined;
  const report = await updateReportContent(id, content, metadata);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(report);
}
