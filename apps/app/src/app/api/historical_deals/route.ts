import { NextResponse } from "next/server";
import { getHistoricalDeals } from "@/lib/db-queries";

/** GET /api/historical_deals - List all historical deals. See docs/api/openapi.yaml */
export async function GET() {
  try {
    const deals = await getHistoricalDeals();
    return NextResponse.json(deals);
  } catch (err) {
    console.error("Failed to fetch historical deals:", err);
    return NextResponse.json({ error: "Failed to fetch historical deals" }, { status: 500 });
  }
}
