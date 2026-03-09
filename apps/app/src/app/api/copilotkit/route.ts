import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";
import { aguiMiddleware } from "@/app/api/copilotkit/ag-ui-middleware";

// 1. Define the agent connection to LangGraph
const defaultAgent = new LangGraphAgent({
  deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123",
  graphId: "sample_agent",
  langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
});

// 2. Bind in middleware to the agent. For A2UI and MCP Apps.
defaultAgent.use(...aguiMiddleware);

// 3. Define the route and CopilotRuntime for the agent
export const POST = async (req: NextRequest) => {
  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      endpoint: "/api/copilotkit",
      serviceAdapter: new ExperimentalEmptyAdapter(),
      runtime: new CopilotRuntime({
        agents: {
          default: defaultAgent,
        },
      }),
    });

    return handleRequest(req);
  } catch (error) {
    console.error("CopilotKit agent error:", error);
    return new Response(
      JSON.stringify({
        error:
          "The AI agent is temporarily unavailable. Please try again in a moment.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
