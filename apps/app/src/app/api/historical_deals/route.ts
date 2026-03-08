import { NextResponse } from "next/server";
import { getHistoricalDeals } from "@/lib/mock-db";

export async function GET() {
  const deals = await getHistoricalDeals();
  return NextResponse.json(deals);
}
