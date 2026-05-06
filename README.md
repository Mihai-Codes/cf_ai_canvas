# cf_ai_canvas

**AI-Powered Collaborative Canvas as a Remote MCP Server on Cloudflare Workers**

> Built for the Cloudflare Software Engineering Internship (Summer 2026) assignment.

[![Live App](https://img.shields.io/badge/live-cf--ai--canvas-0f172a?style=for-the-badge&logo=cloudflare)](https://cf-ai-canvas.mc146.workers.dev)
[![Remote MCP](https://img.shields.io/badge/MCP-remote%20server-2563eb?style=for-the-badge)](https://cf-ai-canvas.mc146.workers.dev/mcp)
[![Cloudflare Workers](https://img.shields.io/badge/Workers-edge%20runtime-f38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/workers/)
[![Workers AI](https://img.shields.io/badge/Workers%20AI-Llama%203.3-7c3aed?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/workers-ai/)
[![Durable Objects](https://img.shields.io/badge/Durable%20Objects-state-059669?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/durable-objects/)
[![tldraw](https://img.shields.io/badge/tldraw-canvas-111827?style=for-the-badge)](https://tldraw.dev/)

## Live Demo

- App: https://cf-ai-canvas.mc146.workers.dev
- MCP endpoint: https://cf-ai-canvas.mc146.workers.dev/mcp

## tldraw-Generated Architecture

Generated in the live app with the prompt `Create a Cloudflare Workers AI architecture diagram`.

![tldraw-generated Cloudflare Workers AI architecture diagram](docs/assets/tldraw-architecture.png)

## Assignment Mapping

| Requirement | Implementation |
|-------------|----------------|
| **LLM** | Workers AI using Llama 3.3 for natural language to diagram planning |
| **Workflow / coordination** | Cloudflare Workers route requests; Durable Objects coordinate per-session chat, canvas, and MCP state |
| **User input** | React chat interface served by Cloudflare Workers static assets |
| **Memory or state** | Durable Object state for live canvas/session data; KV for named canvas snapshots |
| **Cloudflare deployment** | Deployed Worker at `cf-ai-canvas.mc146.workers.dev` |
| **AI-assisted development docs** | `PROMPTS.md` records the prompts and implementation decisions |

## 🎯 What It Does

Describe what you want to draw in natural language — flowcharts, architecture diagrams, system designs — and an AI agent creates it on a live canvas in real-time.

**Plus:** Any MCP client (Claude, Cursor, Copilot, VS Code) can connect to the remote `/mcp` endpoint and programmatically control the canvas with 17 tools.

## 🏗️ Architecture

```mermaid
flowchart LR
  user["User"]
  mcpClient["External MCP client\nClaude, Cursor, VS Code"]
  frontend["React + tldraw UI\nCloudflare static assets"]
  worker["Cloudflare Worker\nsrc/server.ts"]
  chat["ChatAgent Durable Object\nAIChatAgent session state"]
  mcp["CanvasMCP Durable Object\nRemote MCP server at /mcp"]
  ai["Workers AI\nLlama 3.3"]
  kv["Workers KV\nNamed snapshots"]

  user -->|"chat prompt"| frontend
  frontend <-->|"WebSocket state sync"| chat
  frontend -->|"HTTP / WebSocket"| worker
  worker --> chat
  worker --> mcp
  chat -->|"diagram planning"| ai
  chat -->|"canvas state"| chat
  mcpClient -->|"Streamable HTTP MCP"| mcp
  mcp -->|"snapshot / restore"| kv
  mcp -->|"17 canvas tools"| mcp
```

## Request Flow

```mermaid
sequenceDiagram
  participant User
  participant UI as React chat + tldraw
  participant Chat as ChatAgent Durable Object
  participant AI as Workers AI
  participant Canvas as tldraw canvas
  participant MCP as CanvasMCP /mcp
  participant KV as Workers KV

  User->>UI: Describe a diagram
  UI->>Chat: Send chat message
  Chat->>AI: Generate structured diagram plan
  AI-->>Chat: JSON plan with shapes, labels, positions
  Chat->>Chat: Persist canvas state
  Chat-->>UI: Stream response + synced state
  UI->>Canvas: Render generated shapes
  MCP->>KV: Save or restore named snapshots
```

The live app includes a quick prompt, `Create a Cloudflare Workers AI architecture diagram`, which uses the same tldraw canvas path to generate an architecture diagram interactively.

## Canvas Rendering Note

The project stores and syncs tldraw-compatible canvas elements. In local development, the full tldraw editor renders without a license. On production HTTPS domains, tldraw SDK v4+ requires a license key, so the deployed app includes a read-only SVG renderer for generated diagrams when `VITE_TLDRAW_LICENSE_KEY` is not configured.

To enable the production tldraw editor, request a tldraw trial or hobby license and build with:

```bash
VITE_TLDRAW_LICENSE_KEY="your-license-key" npm run build
npm run deploy
```

For CI/CD, add `VITE_TLDRAW_LICENSE_KEY` as a GitHub Actions secret. The workflow passes it into the Vite build step without committing the key.

## ☁️ Cloudflare Products Used

| Product | Purpose |
|---------|---------|
| **Workers** | Serverless compute — hosts both agents and serves frontend |
| **Workers AI** | Llama 3.3 70B for natural language → diagram generation |
| **Durable Objects** | Per-session canvas state with SQLite persistence |
| **KV** | Named canvas snapshots that persist beyond sessions |
| **Pages/Assets** | Static frontend (React + tldraw) |

## 🛠️ MCP Tools (17)

| Category | Tools |
|----------|-------|
| **CRUD** | `create_element`, `get_element`, `update_element`, `delete_element`, `batch_create_elements`, `query_elements`, `clear_canvas` |
| **Scene** | `describe_scene`, `export_scene`, `import_scene` |
| **State** | `snapshot_scene`, `restore_snapshot` |
| **Layout** | `align_elements`, `distribute_elements`, `set_viewport` |
| **Docs/Meta** | `get_canvas_stats`, `read_diagram_guide` |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account ([free tier works](https://dash.cloudflare.com/sign-up))

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

### Connect from Claude Desktop

```json
{
  "mcpServers": {
        "canvas": {
          "command": "npx",
          "args": [
            "mcp-remote",
            "https://cf-ai-canvas.mc146.workers.dev/mcp"
          ]
        }
      }
}
```

## 💬 Chat Interface

Open the deployed URL in a browser. The React client connects to `ChatAgent` with `useAgentChat`, and the tldraw canvas renders synchronized agent state.

## 🧪 Testing

```bash
npm run lint
npm run build
```

## 🔁 CI/CD

GitHub Actions runs on every pull request and every push to `main`:

- `npm ci`
- `npm run lint`
- `npm run build`
- guarded Cloudflare deploy on `main`

To enable automatic deployments from GitHub, add these repository secrets:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID for the Workers account |
| `CLOUDFLARE_API_TOKEN` | API token scoped to edit/deploy Workers on that account |

The workflow is defined in `.github/workflows/ci.yml`. If the secrets are missing, the deploy step is skipped while checks still run.

## 📁 Project Structure

```
cf_ai_canvas/
├── src/
│   ├── server.ts          # Worker entry point
│   ├── canvas-mcp.ts      # McpAgent — 17 canvas tools + state
│   ├── chat-agent.ts      # AIChatAgent — NL→canvas via Llama 3.3
│   ├── client.tsx         # React chat + tldraw frontend
│   ├── styles.css         # Frontend styling
│   └── types.ts           # Shared TypeScript types
├── index.html             # Vite frontend entry
├── public/
│   └── index.html         # Static fallback redirect
├── wrangler.jsonc          # Cloudflare configuration
├── PROMPTS.md              # AI prompts used (assignment requirement)
└── README.md
```

## 🔒 Security

- MCP endpoint is currently public (no auth required for demo)
- GitHub OAuth can be added following the [Cloudflare MCP auth guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/#add-authentication)
- Input validation via Zod on all tool parameters

## 📚 References

- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
- [McpAgent API](https://developers.cloudflare.com/agents/api-reference/mcp-agent-api/)
- [Remote MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [tldraw](https://tldraw.dev/) — infinite canvas SDK
- [Original tldraw-mcp-server](https://github.com/Mihai-Codes/tldraw-mcp-server) — local MCP server this project is based on

## 👤 Author

**Mihai-Alexandru Chindriș** — [GitHub](https://github.com/chindris-mihai-alexandru) | [LinkedIn](https://www.linkedin.com/in/mihai-chindris/)

Built for the Cloudflare Software Engineering Internship (Summer 2026) application.
