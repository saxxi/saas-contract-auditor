import { NextResponse } from "next/server";
import { getReport, updateReportContent } from "@/lib/mock-db";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const metadata = body.proposition_type
    ? { proposition_type: body.proposition_type, strategic_bucket: body.strategic_bucket, success_percent: body.success_percent, intervene: body.intervene, priority_score: body.priority_score, score_rationale: body.score_rationale }
    : undefined;
  const report = await updateReportContent(id, body.content, metadata);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(report);
}
