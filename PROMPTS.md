# AI Prompts Used During Development

This document records the AI prompts and interactions used to build `cf_ai_canvas`, as required by the Cloudflare internship assignment.

## Architecture & Planning

### Prompt 1: Project Direction
> "I have an existing tldraw MCP server (17 tools for programmatic canvas control via AI agents). I want to port it to Cloudflare Workers for a Cloudflare internship application. The assignment requires: LLM (Llama 3.3 on Workers AI), workflow/coordination (Workers or Durable Objects), user input via chat (Pages), and memory/state. What's the best architecture?"

**Result:** Decided on a dual-agent architecture:
- `CanvasMCP` (McpAgent) — remote MCP server exposing 17 canvas tools at `/mcp`
- `ChatAgent` (AIChatAgent) — NL→canvas orchestration via Workers AI (Llama 3.3 70B)
- Frontend: split-screen chat + live tldraw canvas
- State: Durable Objects (SQLite) for canvas, KV for snapshots

### Prompt 2: Cloudflare SDK Research
> "Search the Cloudflare Agents docs for McpAgent API, tool registration patterns, state management, and the remote MCP server guide. Also get the chat agent tutorial."

**Result:** Used official docs to implement:
- `McpAgent.serve("/mcp")` for Streamable HTTP transport
- `this.setState()` for persistent canvas state
- `AIChatAgent` + `useAgentChat` for streaming AI chat
- KV namespace for snapshot persistence

## Implementation

### Prompt 3: Scaffold Generation
> "Start Phase 1: scaffold the cf_ai_canvas project with wrangler.jsonc, package.json, tsconfig, server entry, McpAgent with all 17 tools, ChatAgent with Workers AI, and a basic frontend."

**Result:** Generated complete project scaffold including:
- All 17 MCP tools ported from tldraw-mcp-server (stdio → McpAgent stateful)
- Workers AI integration with Llama 3.3 70B for NL→diagram
- Wrangler config with DO bindings, AI binding, KV namespace
- Static HTML frontend placeholder

### Prompt 4: GitHub Repository Move
> "The repo needs to be under my Mihai-Codes org account, please move it there."

**Result:** Created `Mihai-Codes/cf_ai_canvas`, repointed the local `origin`, pushed `main`, and updated README clone instructions.

### Prompt 5: React + tldraw Frontend
> "Continue where AdaL left off. Also search the web. Ultra-think."

**Result:** Used current official Cloudflare Agents and tldraw docs to replace the placeholder page with:
- React/Vite frontend entry
- `useAgent` + `useAgentChat` connection to `ChatAgent`
- tldraw canvas rendering from synchronized Durable Object state
- Quick prompts, streaming messages, chat reset, and canvas reset
- Production build and TypeScript verification

### Prompt 6: Deploy and Verify
> "Ok, retry."

**Result:** Authenticated Wrangler, created the `CANVAS_KV` namespace, deployed to Cloudflare Workers, fixed `/mcp` routing by explicitly forwarding the endpoint to `CanvasMCP.serve("/mcp", { binding: "CanvasMCP" })`, and verified:
- Live frontend route: `https://cf-ai-canvas.mc146.workers.dev`
- Remote MCP initialize over HTTPS
- `tools/list` returns all 17 canvas tools

## Key Design Decisions Made with AI Assistance

1. **McpAgent over createMcpHandler** — chose stateful (DO-backed) because canvas state must persist across tool calls
2. **Dual-agent pattern** — ChatAgent handles NL interpretation, CanvasMCP handles canvas state. Separation of concerns.
3. **KV for snapshots** — DO state resets per session; named snapshots need persistence beyond session lifetime
4. **Streamable HTTP transport** — modern MCP spec standard; works with MCP Inspector, Claude, Cursor out of the box
5. **React state sync over custom polling** — Cloudflare’s `useAgent` already provides WebSocket state synchronization, so the tldraw canvas reads `agent.state` directly.

---

*More prompts will be added as development continues.*
