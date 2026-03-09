import { NextResponse } from "next/server";
import { getReports } from "@/lib/db-queries";

/** GET /api/account_reports - List all reports, ordered by generated_at desc. See docs/api/openapi.yaml */
export async function GET() {
  try {
    const reports = await getReports();
    return NextResponse.json(reports);
  } catch (err) {
    console.error("Failed to fetch reports:", err);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
