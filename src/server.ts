/**
 * Worker entry point — routes requests to agents and serves static assets.
 */
import { routeAgentRequest } from "agents";
import { ChatAgent } from "./chat-agent";
import { CanvasMCP, canvasMcpHandler } from "./canvas-mcp";

// Re-export agent classes so Cloudflare can instantiate them
export { ChatAgent, CanvasMCP };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/mcp")) {
      return canvasMcpHandler.fetch(request, env, ctx);
    }

    // Route to agents (ChatAgent WebSocket, CanvasMCP /mcp endpoint)
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    // Fallback — static assets handled automatically by the assets binding
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
