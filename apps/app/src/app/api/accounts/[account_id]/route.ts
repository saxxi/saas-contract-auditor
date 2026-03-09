import { NextResponse } from "next/server";
import { getAccount } from "@/lib/db-queries";

/** GET /api/accounts/:account_id - Get a single account by ID. See docs/api/openapi.yaml */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ account_id: string }> }
) {
  const { account_id } = await params;
  try {
    const account = await getAccount(account_id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json(account);
  } catch (err) {
    console.error(`Failed to fetch account ${account_id}:`, err);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}
