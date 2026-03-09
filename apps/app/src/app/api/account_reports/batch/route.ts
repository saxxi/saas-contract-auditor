import { NextResponse } from "next/server";
import { z } from "zod";
import { createReports } from "@/lib/db-queries";

const batchSchema = z.object({
  account_ids: z.array(z.string().min(1)).min(1).max(5),
});

/** POST /api/account_reports/batch - Create reports for up to 5 accounts. See docs/api/openapi.yaml */
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const message = errors.fieldErrors.account_ids?.[0] ?? "Invalid request body";
    return NextResponse.json({ error: message, details: errors.fieldErrors }, { status: 400 });
  }
  const reports = await createReports(parsed.data.account_ids);
  return NextResponse.json(reports, { status: 201 });
}
