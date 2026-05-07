/**
 * ChatAgent — AI chat interface that interprets natural language
 * and orchestrates canvas operations via Workers AI (Llama 3.3).
 *
 * Users type things like "draw a flowchart of a login system" and
 * the LLM generates the appropriate tool calls that mutate canvas state.
 *
 * Canvas state is held directly in this agent's DO state and synced
 * to connected clients in real-time via WebSocket.
 */
import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, streamText } from "ai";
import { z } from "zod";
import type { CanvasElement, CanvasState } from "./types";

// Shape and color schemas
const ShapeTypeSchema = z.enum([
  "rectangle", "ellipse", "diamond", "triangle", "text",
  "arrow", "line", "note", "frame", "star", "cloud", "hexagon",
]);

const ColorSchema = z.enum([
  "black", "grey", "blue", "light-blue", "violet", "light-violet",
  "red", "light-red", "orange", "yellow", "green", "light-green", "white",
]);

const PlannedElementSchema = z.object({
  type: ShapeTypeSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().optional(),
  height: z.number().finite().optional(),
  text: z.string().max(120).optional(),
  color: ColorSchema.optional(),
});

const DiagramPlanSchema = z.object({
  summary: z.string().min(1).max(240),
  elements: z.array(PlannedElementSchema).min(1).max(24),
});

const RUNTIME_WARNING_PATTERNS = [
  /\b--no-sandbox\b/i,
  /DevTools listening on ws:\/\//i,
  /Failed to move to new namespace/i,
  /zygote host/i,
  /crbug\/1173575/i,
  /Opening in existing browser session/i,
];

// Extended state: chat messages (auto-managed by AIChatAgent) + canvas state
interface ChatAgentState {
  canvas: CanvasState;
}

type PlannedElement = {
  type: CanvasElement["type"];
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: CanvasElement["color"];
};

type DiagramPlan = {
  summary: string;
  elements: PlannedElement[];
};

type DiagramIntent = "architecture" | "oauth_flow" | "login_flow" | "generic";

export class ChatAgent extends AIChatAgent<Env, ChatAgentState> {
  initialState: ChatAgentState = {
    canvas: {
      elements: {},
      viewportZoom: 1,
      viewportX: 0,
      viewportY: 0,
    },
  };

  // Helper: create an element and persist to state
  private createElement(input: {
    type: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    text?: string;
    color?: string;
    startBoundTo?: string;
    endBoundTo?: string;
  }): CanvasElement {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const element: CanvasElement = {
      id,
      type: input.type as CanvasElement["type"],
      x: input.x,
      y: input.y,
      width: input.width ?? 100,
      height: input.height ?? 100,
      text: input.text,
      color: (input.color as CanvasElement["color"]) ?? "black",
      fill: "none",
      dash: "draw",
      size: "m",
      font: "draw",
      start: input.startBoundTo ? { x: input.x, y: input.y, boundTo: input.startBoundTo } : undefined,
      end: input.endBoundTo ? { x: input.x + (input.width ?? 100), y: input.y, boundTo: input.endBoundTo } : undefined,
      createdAt: now,
      updatedAt: now,
    };
    return element;
  }

  // Helper: update canvas state
  private updateCanvas(elements: Record<string, CanvasElement>) {
    this.setState({
      ...this.state,
      canvas: { ...this.state.canvas, elements },
    });
  }

  private sanitizeText(input: string): string {
    const cleaned = input
      .split(/\r?\n/)
      .filter((line) => !RUNTIME_WARNING_PATTERNS.some((pattern) => pattern.test(line)))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return cleaned;
  }

  private truncateLabel(input: string, maxLength = 72): string {
    const compact = input.replace(/\s+/g, " ").trim();
    if (compact.length <= maxLength) return compact;
    return `${compact.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }

  private getLastUserText(): string {
    for (let index = this.messages.length - 1; index >= 0; index--) {
      const message = this.messages[index] as any;
      if (message.role !== "user") continue;

      if (typeof message.content === "string") {
        const sanitized = this.sanitizeText(message.content);
        if (sanitized) return sanitized;
      }

      if (Array.isArray(message.parts)) {
        const text = message.parts
          .filter((part: any) => part?.type === "text")
          .map((part: any) => part.text)
          .join(" ");

        const sanitized = this.sanitizeText(text);
        if (sanitized) return sanitized;
      }
    }

    return "Draw a simple diagram";
  }

  private detectIntent(prompt: string): DiagramIntent {
    const normalized = prompt.toLowerCase();
    const scores: Record<DiagramIntent, number> = {
      architecture: 0,
      oauth_flow: 0,
      login_flow: 0,
      generic: 0,
    };

    const addScore = (intent: DiagramIntent, keywords: string[], value = 1) => {
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) scores[intent] += value;
      }
    };

    addScore("architecture", [
      "architecture", "system design", "cloudflare", "workers ai", "durable object", "edge", "kv", "mcp server",
    ], 2);
    addScore("architecture", ["service", "component", "data flow", "diagram"], 1);

    addScore("oauth_flow", [
      "oauth", "authorization code", "auth code", "access token", "refresh token", "consent", "callback", "redirect uri",
    ], 2);
    addScore("oauth_flow", ["mcp", "provider", "token", "scope"], 1);

    addScore("login_flow", [
      "login", "log in", "sign in", "credentials", "password", "otp", "success", "error", "failure", "retry",
    ], 2);
    addScore("login_flow", ["auth", "authentication", "session"], 1);

    const ranked = [
      ["oauth_flow", scores.oauth_flow] as const,
      ["login_flow", scores.login_flow] as const,
      ["architecture", scores.architecture] as const,
    ].sort((a, b) => b[1] - a[1]);

    if (ranked[0][1] >= 2) return ranked[0][0];
    return "generic";
  }

  private normalizeNumber(value: unknown, fallback: number): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }

  private parsePlan(rawText: string): DiagramPlan | null {
    const cleanedText = this.sanitizeText(rawText).trim();
    const fenced = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fenced?.[1] ?? cleanedText.match(/\{[\s\S]*\}/)?.[0] ?? cleanedText;

    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== "object") return null;

      const summary = this.sanitizeText(String((parsed as any).summary ?? "Created a diagram on the canvas."));
      const rawElements = Array.isArray((parsed as any).elements) ? (parsed as any).elements.slice(0, 24) : [];

      const elements: PlannedElement[] = rawElements.map((element: any) => ({
        type: ShapeTypeSchema.safeParse(element?.type).success ? element.type : "rectangle",
        x: this.normalizeNumber(element?.x, 100),
        y: this.normalizeNumber(element?.y, 100),
        width: Number.isFinite(element?.width) ? Number(element.width) : undefined,
        height: Number.isFinite(element?.height) ? Number(element.height) : undefined,
        text: typeof element?.text === "string"
          ? this.truncateLabel(this.sanitizeText(element.text), 96)
          : undefined,
        color: ColorSchema.safeParse(element?.color).success ? element.color : "blue",
      }));

      const validated = DiagramPlanSchema.safeParse({
        summary: summary || "Created a diagram on the canvas.",
        elements,
      });

      return validated.success ? validated.data : null;
    } catch {
      return null;
    }
  }

  private isPlanRichEnough(plan: DiagramPlan, intent: DiagramIntent): boolean {
    const connectors = plan.elements.filter((element) => element.type === "arrow" || element.type === "line").length;
    const decisions = plan.elements.filter((element) => element.type === "diamond").length;
    const labeledNodes = plan.elements.filter(
      (element) => element.type !== "arrow" && element.type !== "line" && (element.text?.trim().length ?? 0) >= 3,
    ).length;

    const slots = new Set(
      plan.elements.map((element) => `${Math.round(element.x / 40)}:${Math.round(element.y / 40)}`),
    ).size;

    if (slots < Math.ceil(plan.elements.length * 0.6)) return false;

    if (intent === "architecture") {
      return plan.elements.length >= 9 && connectors >= 4 && labeledNodes >= 5;
    }

    if (intent === "oauth_flow") {
      return plan.elements.length >= 8 && connectors >= 4 && labeledNodes >= 4;
    }

    if (intent === "login_flow") {
      return plan.elements.length >= 7 && connectors >= 4 && decisions >= 1 && labeledNodes >= 4;
    }

    return plan.elements.length >= 4 && connectors >= 1 && labeledNodes >= 3;
  }

  private buildArchitectureTemplate(prompt: string): DiagramPlan {
    return {
      summary: "Created a Cloudflare Workers AI architecture diagram with frontend, edge runtime, and state services.",
      elements: [
        { type: "text", x: 60, y: 18, width: 480, text: this.truncateLabel(`Architecture: ${prompt}`, 84), color: "black" },
        { type: "frame", x: 40, y: 48, width: 320, height: 280, text: "Client Layer", color: "light-blue" },
        { type: "rectangle", x: 78, y: 96, width: 244, height: 76, text: "React Chat UI", color: "blue" },
        { type: "rectangle", x: 78, y: 208, width: 244, height: 76, text: "tldraw Canvas", color: "light-blue" },

        { type: "frame", x: 418, y: 48, width: 430, height: 338, text: "Cloudflare Worker Runtime", color: "light-violet" },
        { type: "rectangle", x: 468, y: 96, width: 330, height: 76, text: "Worker Router (src/server.ts)", color: "orange" },
        { type: "rectangle", x: 468, y: 230, width: 164, height: 98, text: "ChatAgent\nDurable Object", color: "green" },
        { type: "rectangle", x: 636, y: 230, width: 164, height: 98, text: "CanvasMCP\nDurable Object", color: "violet" },

        { type: "frame", x: 900, y: 48, width: 350, height: 338, text: "Cloudflare Services", color: "yellow" },
        { type: "rectangle", x: 958, y: 110, width: 234, height: 84, text: "Workers AI\nLlama 3.3", color: "red" },
        { type: "rectangle", x: 958, y: 250, width: 234, height: 84, text: "Workers KV\nNamed snapshots", color: "yellow" },

        { type: "arrow", x: 326, y: 134, width: 136, height: 0, color: "grey" },
        { type: "arrow", x: 326, y: 246, width: 136, height: 0, color: "grey" },
        { type: "arrow", x: 552, y: 176, width: 0, height: 50, color: "grey" },
        { type: "arrow", x: 708, y: 176, width: 0, height: 50, color: "grey" },
        { type: "arrow", x: 802, y: 136, width: 148, height: 8, color: "grey" },
        { type: "arrow", x: 802, y: 274, width: 148, height: 8, color: "grey" },
      ],
    };
  }

  private buildOauthTemplate(prompt: string): DiagramPlan {
    return {
      summary: "Created a 4-step MCP OAuth flow with authorization, callback, token exchange, and API access.",
      elements: [
        { type: "text", x: 70, y: 22, width: 520, text: this.truncateLabel(`OAuth Flow: ${prompt}`, 88), color: "black" },
        { type: "rectangle", x: 80, y: 120, width: 200, height: 82, text: "MCP Client", color: "blue" },
        { type: "rectangle", x: 360, y: 120, width: 230, height: 82, text: "Auth Endpoint\n/oauth/authorize", color: "orange" },
        { type: "diamond", x: 660, y: 110, width: 170, height: 100, text: "User\nconsents?", color: "yellow" },
        { type: "rectangle", x: 900, y: 120, width: 230, height: 82, text: "Callback\ncode + state", color: "green" },
        { type: "rectangle", x: 900, y: 270, width: 230, height: 82, text: "Token Endpoint\n/oauth/token", color: "violet" },
        { type: "note", x: 1210, y: 270, width: 210, height: 82, text: "Persist access token in Durable Object session", color: "light-green" },
        { type: "rectangle", x: 1210, y: 120, width: 210, height: 82, text: "Call /mcp tools", color: "light-blue" },

        { type: "arrow", x: 290, y: 160, width: 58, height: 0, color: "grey" },
        { type: "arrow", x: 600, y: 160, width: 50, height: 0, color: "grey" },
        { type: "arrow", x: 840, y: 160, width: 48, height: 0, color: "grey" },
        { type: "arrow", x: 1015, y: 212, width: 0, height: 46, color: "grey" },
        { type: "arrow", x: 1140, y: 312, width: 56, height: 0, color: "grey" },
        { type: "arrow", x: 1140, y: 160, width: 56, height: 0, color: "grey" },
      ],
    };
  }

  private buildLoginTemplate(prompt: string): DiagramPlan {
    return {
      summary: "Created a login flow with explicit success and error branches.",
      elements: [
        { type: "text", x: 80, y: 24, width: 460, text: this.truncateLabel(`Login Flow: ${prompt}`, 84), color: "black" },
        { type: "ellipse", x: 110, y: 140, width: 150, height: 70, text: "Start", color: "blue" },
        { type: "rectangle", x: 330, y: 132, width: 230, height: 84, text: "Enter email + password", color: "light-blue" },
        { type: "diamond", x: 640, y: 124, width: 190, height: 100, text: "Credentials valid?", color: "yellow" },

        { type: "rectangle", x: 930, y: 72, width: 220, height: 82, text: "Create session", color: "green" },
        { type: "rectangle", x: 1200, y: 72, width: 220, height: 82, text: "Show dashboard", color: "light-green" },

        { type: "rectangle", x: 930, y: 240, width: 220, height: 82, text: "Show invalid login error", color: "red" },
        { type: "rectangle", x: 1200, y: 240, width: 220, height: 82, text: "Retry login", color: "orange" },

        { type: "arrow", x: 270, y: 176, width: 48, height: 0, color: "grey" },
        { type: "arrow", x: 570, y: 176, width: 56, height: 0, color: "grey" },
        { type: "arrow", x: 830, y: 152, width: 90, height: -26, text: "yes", color: "grey" },
        { type: "arrow", x: 1160, y: 110, width: 32, height: 0, color: "grey" },
        { type: "arrow", x: 830, y: 198, width: 90, height: 70, text: "no", color: "grey" },
        { type: "arrow", x: 1160, y: 280, width: 32, height: 0, color: "grey" },
        { type: "arrow", x: 1310, y: 240, width: -920, height: -16, text: "try again", color: "grey" },
      ],
    };
  }

  private fallbackPlan(prompt: string, intent: DiagramIntent): DiagramPlan {
    if (intent === "architecture") return this.buildArchitectureTemplate(prompt);
    if (intent === "oauth_flow") return this.buildOauthTemplate(prompt);
    if (intent === "login_flow") return this.buildLoginTemplate(prompt);

    return {
      summary: `Created a simple three-step diagram for: ${this.truncateLabel(prompt, 70)}`,
      elements: [
        { type: "rectangle", x: 100, y: 120, width: 180, height: 80, text: "Start", color: "blue" },
        { type: "arrow", x: 290, y: 150, width: 120, height: 0, color: "grey" },
        { type: "rectangle", x: 430, y: 120, width: 200, height: 80, text: "Process", color: "green" },
        { type: "arrow", x: 640, y: 150, width: 120, height: 0, color: "grey" },
        { type: "rectangle", x: 780, y: 120, width: 180, height: 80, text: "Done", color: "violet" },
      ],
    };
  }

  private async generatePlanWithModel(prompt: string, intent: DiagramIntent, model: any): Promise<DiagramPlan | null> {
    const minimumElements = intent === "architecture"
      ? 9
      : intent === "oauth_flow"
        ? 8
        : intent === "login_flow"
          ? 7
          : 4;

    const planner = await generateText({
      model,
      system: `You convert user requests into tldraw canvas JSON.

Return only valid JSON with this exact shape:
{
  "summary": "one short sentence describing what you created",
  "elements": [
    {
      "type": "rectangle | ellipse | diamond | triangle | text | arrow | line | note | frame | star | cloud | hexagon",
      "x": 100,
      "y": 100,
      "width": 180,
      "height": 80,
      "text": "label",
      "color": "black | grey | blue | light-blue | violet | light-violet | red | light-red | orange | yellow | green | light-green | white"
    }
  ]
}

Intent: ${intent}.
Create at least ${minimumElements} elements and include connectors with arrows.
Layout rules:
- Use a grid system with 120px spacing between elements
- Start from x=60, y=60 and increment by 120px
- Keep at least 40px minimum spacing between all elements
- Place elements left-to-right, then top-to-bottom
- Use arrows to show flow between elements
- Ensure no elements overlap
- Use clear, concise labels (3-5 words max)
- For architecture: group related components with frames
- For flows: use diamonds for decisions, rectangles for steps
Do not include markdown, explanations, or code comments.`,
      prompt,
    });

    const parsed = this.parsePlan(planner.text);
    if (!parsed) return null;
    return this.isPlanRichEnough(parsed, intent) ? parsed : null;
  }

  private fixLayoutOverlaps(elements: PlannedElement[]): PlannedElement[] {
    const GRID_SIZE = 120;
    const MIN_SPACING = 40;
    const REPULSION_FORCE = 0.1;
    const MAX_ITERATIONS = 50;
    
    if (elements.length <= 1) return [...elements];
    
    const nodes = elements.map((element, index) => ({
      ...element,
      id: index,
      x: element.x ?? 100,
      y: element.y ?? 100,
      vx: 0,
      vy: 0,
    }));
    
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      nodes.forEach((node) => {
        node.vx = 0;
        node.vy = 0;
      });
      
      nodes.forEach((nodeA, i) => {
        nodes.forEach((nodeB, j) => {
          if (i === j) return;
          
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < MIN_SPACING) {
            const force = REPULSION_FORCE / (distance * distance);
            nodeA.vx -= dx * force;
            nodeA.vy -= dy * force;
            nodeB.vx += dx * force;
            nodeB.vy += dy * force;
          }
        });
      });
      
      let totalMovement = 0;
      nodes.forEach((node) => {
        const movement = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        totalMovement += movement;
        
        node.x += node.vx;
        node.y += node.vy;
        
        node.x = Math.max(20, Math.min(1500, node.x));
        node.y = Math.max(20, Math.min(1500, node.y));
      });
      
      if (totalMovement < 0.1) break;
    }
    
    return nodes.map(({ x, y, ...rest }) => ({ ...rest, x, y }));
  }

  private applyPlan(plan: DiagramPlan) {
    const nextElements = { ...this.state.canvas.elements };
    
    const fixedElements = this.fixLayoutOverlaps(plan.elements);
    
    for (const input of fixedElements) {
      const element = this.createElement(input);
      nextElements[element.id] = element;
    }
    this.updateCanvas(nextElements);
  }

  async onChatMessage(onFinish?: any) {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const model = workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    const userPrompt = this.getLastUserText();
    const intent = this.detectIntent(userPrompt);

    let plan: DiagramPlan | null = null;

    if (intent === "generic") {
      plan = await this.generatePlanWithModel(userPrompt, intent, model);
    }

    if (!plan) {
      plan = this.fallbackPlan(userPrompt, intent);
    }

    this.applyPlan(plan);

    const safeSummary = this.sanitizeText(plan.summary) || "Created a diagram on the canvas.";
    const result = streamText({
      model,
      system: "You are a concise canvas assistant. Reply with one short sentence. Do not include logs, warnings, markdown, or code.",
      prompt: `Reply with this summary in one sentence: ${safeSummary}`,
      onFinish,
    });

    return result.toUIMessageStreamResponse();
  }
}
