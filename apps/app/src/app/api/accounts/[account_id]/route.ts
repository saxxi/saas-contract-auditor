import { NextResponse } from "next/server";
import { getAccount } from "@/lib/mock-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ account_id: string }> }
) {
  const { account_id } = await params;
  const account = await getAccount(account_id);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json(account);
}
