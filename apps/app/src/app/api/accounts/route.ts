import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db-queries";

/** GET /api/accounts - List all accounts. See docs/api/openapi.yaml */
export async function GET() {
  try {
    const accounts = await getAccounts();
    return NextResponse.json(accounts);
  } catch (err) {
    console.error("Failed to fetch accounts:", err);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
