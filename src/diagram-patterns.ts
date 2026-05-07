/**
 * Professional Diagram Patterns for cf_ai_canvas
 *
 * Every arrow MUST have startBoundTo + endBoundTo referencing a node id.
 * Every node MUST have a stable id so arrows can reference it.
 * gridCol / gridRow are converted to absolute x/y in generateFallbackDiagram.
 * COL_W = 280px, ROW_H = 170px, origin (50, 50).
 */

export type PlannedElement = {
  type: string;
  gridRow?: number;
  gridCol?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  fill?: string;
  id?: string;
  startBoundTo?: string;
  endBoundTo?: string;
};

export type DiagramPattern = {
  name: string;
  description: string;
  keywords: string[];
  generate: (prompt: string) => PlannedElement[];
};

export const DIAGRAM_PATTERNS: DiagramPattern[] = [
  // ------------------------------------------------------------------
  // LOGIN FLOW
  // ------------------------------------------------------------------
  {
    name: "login_flow",
    description: "Login flow with success and error paths",
    keywords: [
      "login",
      "sign in",
      "sign-in",
      "credentials",
      "authentication",
      "auth",
    ],
    generate: (_prompt: string): PlannedElement[] => [
      // Nodes
      {
        id: "lf_user",
        type: "ellipse",
        gridCol: 0,
        gridRow: 0,
        width: 120,
        height: 70,
        text: "User",
        color: "blue",
      },
      {
        id: "lf_page",
        type: "rectangle",
        gridCol: 1,
        gridRow: 0,
        width: 180,
        height: 70,
        text: "Login Page",
        color: "light-blue",
      },
      {
        id: "lf_validate",
        type: "diamond",
        gridCol: 2,
        gridRow: 0,
        width: 160,
        height: 90,
        text: "Valid?",
        color: "yellow",
      },
      {
        id: "lf_dashboard",
        type: "rectangle",
        gridCol: 3,
        gridRow: 0,
        width: 180,
        height: 70,
        text: "Dashboard",
        color: "green",
        fill: "semi",
      },
      {
        id: "lf_error",
        type: "rectangle",
        gridCol: 2,
        gridRow: 1,
        width: 180,
        height: 70,
        text: "Error Message",
        color: "red",
        fill: "semi",
      },
      // Arrows — every arrow has startBoundTo + endBoundTo
      {
        id: "lf_a1",
        type: "arrow",
        startBoundTo: "lf_user",
        endBoundTo: "lf_page",
        text: "",
        color: "grey",
      },
      {
        id: "lf_a2",
        type: "arrow",
        startBoundTo: "lf_page",
        endBoundTo: "lf_validate",
        text: "submit",
        color: "blue",
      },
      {
        id: "lf_a3",
        type: "arrow",
        startBoundTo: "lf_validate",
        endBoundTo: "lf_dashboard",
        text: "valid",
        color: "green",
      },
      {
        id: "lf_a4",
        type: "arrow",
        startBoundTo: "lf_validate",
        endBoundTo: "lf_error",
        text: "invalid",
        color: "red",
      },
      {
        id: "lf_a5",
        type: "arrow",
        startBoundTo: "lf_error",
        endBoundTo: "lf_page",
        text: "retry",
        color: "orange",
      },
    ],
  },

  // ------------------------------------------------------------------
  // CLOUDFLARE WORKERS AI ARCHITECTURE
  // ------------------------------------------------------------------
  {
    name: "cloudflare_architecture",
    description: "Cloudflare Workers AI architecture diagram",
    keywords: [
      "cloudflare",
      "workers",
      "architecture",
      "durable objects",
      "edge",
      "system design",
      "ai",
    ],
    generate: (_prompt: string): PlannedElement[] => [
      // Nodes
      {
        id: "cf_user",
        type: "ellipse",
        gridCol: 0,
        gridRow: 1,
        width: 120,
        height: 70,
        text: "User",
        color: "blue",
      },
      {
        id: "cf_react",
        type: "rectangle",
        gridCol: 0,
        gridRow: 0,
        width: 180,
        height: 70,
        text: "React + tldraw",
        color: "light-blue",
      },
      {
        id: "cf_worker",
        type: "rectangle",
        gridCol: 1,
        gridRow: 0,
        width: 180,
        height: 70,
        text: "CF Worker",
        color: "orange",
        fill: "semi",
      },
      {
        id: "cf_chat",
        type: "rectangle",
        gridCol: 2,
        gridRow: 0,
        width: 180,
        height: 70,
        text: "ChatAgent DO",
        color: "green",
        fill: "semi",
      },
      {
        id: "cf_mcp",
        type: "rectangle",
        gridCol: 2,
        gridRow: 1,
        width: 180,
        height: 70,
        text: "CanvasMCP DO",
        color: "violet",
        fill: "semi",
      },
      {
        id: "cf_ai",
        type: "rectangle",
        gridCol: 3,
        gridRow: 0,
        width: 180,
        height: 70,
        text: "Workers AI",
        color: "red",
        fill: "semi",
      },
      {
        id: "cf_kv",
        type: "rectangle",
        gridCol: 3,
        gridRow: 1,
        width: 180,
        height: 70,
        text: "Workers KV",
        color: "yellow",
        fill: "semi",
      },
      // Arrows
      {
        id: "cf_a1",
        type: "arrow",
        startBoundTo: "cf_user",
        endBoundTo: "cf_react",
        text: "types",
        color: "grey",
      },
      {
        id: "cf_a2",
        type: "arrow",
        startBoundTo: "cf_react",
        endBoundTo: "cf_worker",
        text: "WebSocket",
        color: "blue",
      },
      {
        id: "cf_a3",
        type: "arrow",
        startBoundTo: "cf_worker",
        endBoundTo: "cf_chat",
        text: "chat req",
        color: "green",
      },
      {
        id: "cf_a4",
        type: "arrow",
        startBoundTo: "cf_worker",
        endBoundTo: "cf_mcp",
        text: "MCP req",
        color: "violet",
      },
      {
        id: "cf_a5",
        type: "arrow",
        startBoundTo: "cf_chat",
        endBoundTo: "cf_ai",
        text: "inference",
        color: "red",
      },
      {
        id: "cf_a6",
        type: "arrow",
        startBoundTo: "cf_mcp",
        endBoundTo: "cf_kv",
        text: "snapshots",
        color: "orange",
      },
    ],
  },

  // ------------------------------------------------------------------
  // OAUTH / MCP OAUTH FLOW
  // ------------------------------------------------------------------
  {
    name: "oauth_flow",
    description: "OAuth 2.0 / MCP authorization flow",
    keywords: [
      "oauth",
      "authorization",
      "auth code",
      "token",
      "consent",
      "redirect",
      "mcp oauth",
    ],
    generate: (_prompt: string): PlannedElement[] => [
      // Nodes
      {
        id: "oa_client",
        type: "rectangle",
        gridCol: 0,
        gridRow: 0,
        width: 160,
        height: 70,
        text: "MCP Client",
        color: "blue",
      },
      {
        id: "oa_auth",
        type: "rectangle",
        gridCol: 1,
        gridRow: 0,
        width: 160,
        height: 70,
        text: "Auth Server",
        color: "orange",
        fill: "semi",
      },
      {
        id: "oa_consent",
        type: "diamond",
        gridCol: 2,
        gridRow: 0,
        width: 160,
        height: 90,
        text: "Consent?",
        color: "yellow",
      },
      {
        id: "oa_code",
        type: "rectangle",
        gridCol: 3,
        gridRow: 0,
        width: 160,
        height: 70,
        text: "Auth Code",
        color: "green",
        fill: "semi",
      },
      {
        id: "oa_exchange",
        type: "rectangle",
        gridCol: 4,
        gridRow: 0,
        width: 160,
        height: 70,
        text: "Token Exchange",
        color: "violet",
        fill: "semi",
      },
      {
        id: "oa_access",
        type: "ellipse",
        gridCol: 5,
        gridRow: 0,
        width: 160,
        height: 70,
        text: "API Access",
        color: "green",
        fill: "semi",
      },
      {
        id: "oa_denied",
        type: "rectangle",
        gridCol: 2,
        gridRow: 1,
        width: 160,
        height: 70,
        text: "Access Denied",
        color: "red",
        fill: "semi",
      },
      // Arrows
      {
        id: "oa_a1",
        type: "arrow",
        startBoundTo: "oa_client",
        endBoundTo: "oa_auth",
        text: "authorize",
        color: "blue",
      },
      {
        id: "oa_a2",
        type: "arrow",
        startBoundTo: "oa_auth",
        endBoundTo: "oa_consent",
        text: "prompt user",
        color: "orange",
      },
      {
        id: "oa_a3",
        type: "arrow",
        startBoundTo: "oa_consent",
        endBoundTo: "oa_code",
        text: "approved",
        color: "green",
      },
      {
        id: "oa_a4",
        type: "arrow",
        startBoundTo: "oa_consent",
        endBoundTo: "oa_denied",
        text: "denied",
        color: "red",
      },
      {
        id: "oa_a5",
        type: "arrow",
        startBoundTo: "oa_code",
        endBoundTo: "oa_exchange",
        text: "callback",
        color: "violet",
      },
      {
        id: "oa_a6",
        type: "arrow",
        startBoundTo: "oa_exchange",
        endBoundTo: "oa_access",
        text: "access token",
        color: "green",
      },
    ],
  },

  // ------------------------------------------------------------------
  // MICROSERVICES
  // ------------------------------------------------------------------
  {
    name: "microservices",
    description: "Microservices architecture",
    keywords: ["microservice", "micro service", "distributed", "api gateway"],
    generate: (_prompt: string): PlannedElement[] => [
      // Nodes
      {
        id: "ms_client",
        type: "ellipse",
        gridCol: 0,
        gridRow: 1,
        width: 120,
        height: 70,
        text: "Client",
        color: "blue",
      },
      {
        id: "ms_gateway",
        type: "rectangle",
        gridCol: 1,
        gridRow: 1,
        width: 180,
        height: 70,
        text: "API Gateway",
        color: "orange",
        fill: "semi",
      },
      {
        id: "ms_auth",
        type: "rectangle",
        gridCol: 2,
        gridRow: 0,
        width: 170,
        height: 70,
        text: "Auth Service",
        color: "green",
        fill: "semi",
      },
      {
        id: "ms_user",
        type: "rectangle",
        gridCol: 2,
        gridRow: 1,
        width: 170,
        height: 70,
        text: "User Service",
        color: "blue",
        fill: "semi",
      },
      {
        id: "ms_order",
        type: "rectangle",
        gridCol: 2,
        gridRow: 2,
        width: 170,
        height: 70,
        text: "Order Service",
        color: "violet",
        fill: "semi",
      },
      {
        id: "ms_payment",
        type: "rectangle",
        gridCol: 3,
        gridRow: 1,
        width: 170,
        height: 70,
        text: "Payment Service",
        color: "red",
        fill: "semi",
      },
      {
        id: "ms_db",
        type: "ellipse",
        gridCol: 3,
        gridRow: 2,
        width: 160,
        height: 70,
        text: "Database",
        color: "yellow",
        fill: "semi",
      },
      // Arrows
      {
        id: "ms_a1",
        type: "arrow",
        startBoundTo: "ms_client",
        endBoundTo: "ms_gateway",
        text: "HTTP",
        color: "grey",
      },
      {
        id: "ms_a2",
        type: "arrow",
        startBoundTo: "ms_gateway",
        endBoundTo: "ms_auth",
        text: "validate",
        color: "green",
      },
      {
        id: "ms_a3",
        type: "arrow",
        startBoundTo: "ms_gateway",
        endBoundTo: "ms_user",
        text: "user ops",
        color: "blue",
      },
      {
        id: "ms_a4",
        type: "arrow",
        startBoundTo: "ms_gateway",
        endBoundTo: "ms_order",
        text: "orders",
        color: "violet",
      },
      {
        id: "ms_a5",
        type: "arrow",
        startBoundTo: "ms_order",
        endBoundTo: "ms_payment",
        text: "charge",
        color: "red",
      },
      {
        id: "ms_a6",
        type: "arrow",
        startBoundTo: "ms_user",
        endBoundTo: "ms_db",
        text: "read/write",
        color: "yellow",
      },
      {
        id: "ms_a7",
        type: "arrow",
        startBoundTo: "ms_order",
        endBoundTo: "ms_db",
        text: "persist",
        color: "orange",
      },
    ],
  },

  // ------------------------------------------------------------------
  // DATA PIPELINE / ETL
  // ------------------------------------------------------------------
  {
    name: "data_flow",
    description: "Data processing pipeline",
    keywords: [
      "data",
      "pipeline",
      "etl",
      "processing",
      "flow",
      "database",
      "storage",
    ],
    generate: (_prompt: string): PlannedElement[] => [
      // Nodes
      {
        id: "df_source",
        type: "ellipse",
        gridCol: 0,
        gridRow: 0,
        width: 160,
        height: 70,
        text: "Data Source",
        color: "light-blue",
      },
      {
        id: "df_ingest",
        type: "rectangle",
        gridCol: 1,
        gridRow: 0,
        width: 160,
        height: 70,
        text: "Ingestion",
        color: "blue",
        fill: "semi",
      },
      {
        id: "df_validate",
        type: "diamond",
        gridCol: 2,
        gridRow: 0,
        width: 160,
        height: 90,
        text: "Valid?",
        color: "yellow",
      },
      {
        id: "df_transform",
        type: "rectangle",
        gridCol: 3,
        gridRow: 0,
        width: 160,
        height: 70,
        text: "Transform",
        color: "orange",
        fill: "semi",
      },
      {
        id: "df_warehouse",
        type: "rectangle",
        gridCol: 4,
        gridRow: 0,
        width: 160,
        height: 70,
        text: "Data Warehouse",
        color: "violet",
        fill: "semi",
      },
      {
        id: "df_error",
        type: "rectangle",
        gridCol: 2,
        gridRow: 1,
        width: 160,
        height: 70,
        text: "Error Queue",
        color: "red",
        fill: "semi",
      },
      // Arrows
      {
        id: "df_a1",
        type: "arrow",
        startBoundTo: "df_source",
        endBoundTo: "df_ingest",
        text: "raw data",
        color: "grey",
      },
      {
        id: "df_a2",
        type: "arrow",
        startBoundTo: "df_ingest",
        endBoundTo: "df_validate",
        text: "parse",
        color: "blue",
      },
      {
        id: "df_a3",
        type: "arrow",
        startBoundTo: "df_validate",
        endBoundTo: "df_transform",
        text: "valid",
        color: "green",
      },
      {
        id: "df_a4",
        type: "arrow",
        startBoundTo: "df_validate",
        endBoundTo: "df_error",
        text: "invalid",
        color: "red",
      },
      {
        id: "df_a5",
        type: "arrow",
        startBoundTo: "df_transform",
        endBoundTo: "df_warehouse",
        text: "load",
        color: "violet",
      },
    ],
  },
];

export function matchPattern(prompt: string): DiagramPattern | null {
  const normalized = prompt.toLowerCase();
  for (const pattern of DIAGRAM_PATTERNS) {
    if (pattern.keywords.some((keyword) => normalized.includes(keyword))) {
      return pattern;
    }
  }
  return null;
}
