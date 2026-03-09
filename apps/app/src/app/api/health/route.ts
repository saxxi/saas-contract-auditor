import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const result: {
    status: "ok" | "degraded";
    db: "ok" | "error";
    agent: "ok" | "error";
    timestamp: string;
  } = {
    status: "ok",
    db: "error",
    agent: "error",
    timestamp: new Date().toISOString(),
  };

  // Check database
  try {
    await db.execute(sql`SELECT 1`);
    result.db = "ok";
  } catch {
    result.db = "error";
  }

  // Check agent (LangGraph)
  const agentUrl =
    process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123";
  try {
    const resp = await fetch(`${agentUrl}/ok`, {
      signal: AbortSignal.timeout(5000),
    });
    result.agent = resp.ok ? "ok" : "error";
  } catch {
    result.agent = "error";
  }

  result.status =
    result.db === "ok" && result.agent === "ok" ? "ok" : "degraded";

  const statusCode = result.status === "ok" ? 200 : 503;
  return NextResponse.json(result, { status: statusCode });
}
