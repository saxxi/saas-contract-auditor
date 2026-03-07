import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/mock-db";

export async function GET() {
  const accounts = await getAccounts();
  return NextResponse.json(accounts);
}
