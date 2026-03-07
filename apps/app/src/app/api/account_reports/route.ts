import { NextResponse } from "next/server";
import { getReports } from "@/lib/mock-db";

export async function GET() {
  const reports = await getReports();
  return NextResponse.json(reports);
}
