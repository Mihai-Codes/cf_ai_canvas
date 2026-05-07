# cf_ai_canvas

**AI-powered collaborative canvas + remote MCP server on Cloudflare Workers**

Built for the Cloudflare Software Engineering Internship (Summer 2026) assignment.

## Live Demo

- **App**: https://cf-ai-canvas.mc146.workers.dev
- **MCP Endpoint**: https://cf-ai-canvas.mc146.workers.dev/mcp

## Assignment Mapping

| Requirement | Implementation |
|-------------|----------------|
| **LLM** | Workers AI using Llama 3.3 for natural language to diagram planning |
| **Workflow / coordination** | Cloudflare Workers route requests; Durable Objects coordinate per-session chat, canvas, and MCP state |
| **User input** | React chat interface served by Cloudflare Workers static assets |
| **Memory or state** | Durable Object state for live canvas/session data; KV for named canvas snapshots |
| **Cloudflare deployment** | Deployed Worker at `cf-ai-canvas.mc146.workers.dev` |
| **AI-assisted development docs** | `PROMPTS.md` records the prompts and implementation decisions |

## Architecture

```mermaid
flowchart LR
  user["User"]
  mcpClient["External MCP client
Claude, Cursor, VS Code"]
  frontend["React + tldraw UI
Cloudflare static assets"]
  worker["Cloudflare Worker
src/server.ts"]
  chat["ChatAgent Durable Object
AIChatAgent session state"]
  mcp["CanvasMCP Durable Object
Remote MCP server at /mcp"]
  aiText["Workers AI
Llama 3.3 (Text)"]
  aiVision["Workers AI
Llama 3.2 Vision"]
  kv["Workers KV
Named snapshots"]

  user -->|"chat prompt"| frontend
  frontend <-->|"WebSocket state sync"| chat
  frontend -->|"HTTP / WebSocket"| worker
  worker --> chat
  worker --> mcp
  chat -->|"text analysis"| aiText
  chat -->|"image analysis"| aiVision
  aiVision -->|"structure extraction"| aiText
  chat -->|"canvas state"| chat
  mcpClient -->|"Streamable HTTP MCP"| mcp
  mcp -->|"snapshot / restore"| kv
  mcp -->|"17 canvas tools"| mcp
```

## Multimodal Diagram Generation



###  Usage Examples

**Text-only mode:**
```
"Draw a login flow with success and error paths"
```

**Multimodal mode:**
1. Click  Attach Image
2. Upload a hand-drawn architecture sketch
3. Add prompt: "Clean up this diagram and add proper labels"
4. Get a structured, professional diagram

###  Current Limitations


- Llama 3.3's spatial reasoning constraints
- Why complex prompts generate simple diagrams
- Workarounds and optimization strategies
- Future enhancement possibilities

**This is expected behavior, not a bug.** Current open-source LLMs have limited spatial reasoning capabilities compared to specialized models like Gemini 1.5 Pro or Claude 3.5 Sonnet.

## Quick Start

### Local Development

```bash
# Clone
git clone https://github.com/Mihai-Codes/cf_ai_canvas.git
cd cf_ai_canvas

# Install
npm install

# Create KV namespace (one-time)
npx wrangler kv namespace create "CANVAS_KV"
# Update the KV ID in wrangler.jsonc

# Log in before running the full Worker locally
npx wrangler login

# Run locally
npm run dev
# Server at http://localhost:8787
# MCP endpoint at http://localhost:8787/mcp
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest
# Enter URL: http://localhost:8787/mcp
# Click Connect → List Tools
```

### Deploy to Cloudflare

```bash
npm run deploy
# Live at https://cf-ai-canvas.mc146.workers.dev
# MCP at https://cf-ai-canvas.mc146.workers.dev/mcp
```

## MCP Tools (17)

| Category | Tools |
|----------|-------|
| **CRUD** | `create_element`, `get_element`, `update_element`, `delete_element`, `batch_create_elements`, `query_elements`, `clear_canvas` |
| **Scene** | `describe_scene`, `export_scene`, `import_scene` |
| **State** | `snapshot_scene`, `restore_snapshot` |
| **Layout** | `align_elements`, `distribute_elements`, `set_viewport` |
| **Docs/Meta** | `get_canvas_stats`, `read_diagram_guide` |

## Cloudflare Products Used

| Product | Purpose |
|---------|---------|
| **Workers** | Serverless compute — hosts both agents and serves frontend |
| **Workers AI** | Llama 3.3 70B for natural language → diagram generation |
| **Durable Objects** | Per-session canvas state with SQLite persistence |
| **KV** | Named canvas snapshots that persist beyond sessions |
| **Pages/Assets** | Static frontend (React + tldraw) |

## Project Structure

```
cf_ai_canvas/
├── src/
│   ├── server.ts          # Worker entry point
│   ├── canvas-mcp.ts      # McpAgent — 17 canvas tools
│   ├── chat-agent.ts      # AIChatAgent — NL→canvas
│   ├── client.tsx         # React + tldraw frontend
│   └── types.ts           # Shared TypeScript types
├── docs/assets/           # Screenshots
├── .github/workflows/    # CI/CD pipeline
├── PROMPTS.md             # AI prompts used

├── README.md              # Documentation
└── wrangler.jsonc         # Cloudflare configuration
```

## Testing

Run MCP endpoint tests:

```bash
npm test
```

Tests verify:
- Basic endpoint reachability
- Accept header requirement
- Session ID requirement
- JSON-RPC error format compliance

## CI/CD

GitHub Actions runs on every pull request and push to `main`:
- Typecheck
- Production build
- Guarded Cloudflare deploy on `main`

Required secrets:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` (Account:Read + Workers Scripts:Edit)
- `VITE_TLDRAW_LICENSE_KEY` (optional for production editor)

## References

- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
- [McpAgent API](https://developers.cloudflare.com/agents/api-reference/mcp-agent-api/)
- [Remote MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [tldraw](https://tldraw.dev/)
- [Original tldraw-mcp-server](https://github.com/Mihai-Codes/tldraw-mcp-server)