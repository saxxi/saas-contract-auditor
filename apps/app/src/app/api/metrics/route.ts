import { NextResponse } from "next/server";

export async function GET() {
  const agentUrl =
    process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123";

  try {
    const resp = await fetch(`${agentUrl}/metrics`, {
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const data = await resp.json();
      return NextResponse.json(data);
    }
    return NextResponse.json(
      { error: "Agent metrics unavailable" },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { error: "Agent unreachable" },
      { status: 503 }
    );
  }
}
