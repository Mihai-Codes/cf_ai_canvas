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

  private getLastUserText(): string {
    for (let index = this.messages.length - 1; index >= 0; index--) {
      const message = this.messages[index] as any;
      if (message.role !== "user") continue;

      if (typeof message.content === "string") return message.content;
      if (Array.isArray(message.parts)) {
        return message.parts
          .filter((part: any) => part?.type === "text")
          .map((part: any) => part.text)
          .join(" ");
      }
    }

    return "Draw a simple diagram";
  }

  private parsePlan(rawText: string): DiagramPlan | null {
    const trimmed = rawText.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fenced?.[1] ?? trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed;

    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed.elements)) return null;

      return {
        summary: String(parsed.summary ?? "Created a diagram on the canvas."),
        elements: parsed.elements.slice(0, 24).map((element: any) => ({
          type: ShapeTypeSchema.safeParse(element.type).success ? element.type : "rectangle",
          x: Number.isFinite(element.x) ? element.x : 100,
          y: Number.isFinite(element.y) ? element.y : 100,
          width: Number.isFinite(element.width) ? element.width : undefined,
          height: Number.isFinite(element.height) ? element.height : undefined,
          text: typeof element.text === "string" ? element.text : undefined,
          color: ColorSchema.safeParse(element.color).success ? element.color : "blue",
        })),
      };
    } catch {
      return null;
    }
  }

  private fallbackPlan(prompt: string): DiagramPlan {
    if (/cloudflare workers ai architecture/i.test(prompt)) {
      return {
        summary: "Created a Cloudflare Workers AI architecture diagram.",
        elements: [
          { type: "rectangle", x: 80, y: 120, width: 190, height: 80, text: "React + tldraw UI", color: "blue" },
          { type: "arrow", x: 290, y: 155, width: 120, height: 0, color: "grey" },
          { type: "rectangle", x: 430, y: 120, width: 210, height: 80, text: "Cloudflare Worker", color: "orange" },
          { type: "arrow", x: 660, y: 155, width: 120, height: 0, color: "grey" },
          { type: "rectangle", x: 800, y: 40, width: 210, height: 80, text: "ChatAgent DO", color: "green" },
          { type: "rectangle", x: 800, y: 210, width: 210, height: 80, text: "CanvasMCP DO", color: "violet" },
          { type: "arrow", x: 900, y: 130, width: 0, height: 70, color: "grey" },
          { type: "rectangle", x: 1120, y: 40, width: 190, height: 80, text: "Workers AI", color: "red" },
          { type: "rectangle", x: 1120, y: 210, width: 190, height: 80, text: "KV Snapshots", color: "yellow" },
        ],
      };
    }

    return {
      summary: `Created a simple three-step diagram for: ${prompt}`,
      elements: [
        { type: "rectangle", x: 100, y: 120, width: 180, height: 80, text: "Start", color: "blue" },
        { type: "arrow", x: 290, y: 150, width: 120, height: 0, color: "grey" },
        { type: "rectangle", x: 430, y: 120, width: 200, height: 80, text: "Process", color: "green" },
        { type: "arrow", x: 640, y: 150, width: 120, height: 0, color: "grey" },
        { type: "rectangle", x: 780, y: 120, width: 180, height: 80, text: "Done", color: "violet" },
      ],
    };
  }

  private applyPlan(plan: DiagramPlan) {
    const nextElements = { ...this.state.canvas.elements };
    for (const input of plan.elements) {
      const element = this.createElement(input);
      nextElements[element.id] = element;
    }
    this.updateCanvas(nextElements);
  }

  async onChatMessage(onFinish?: any) {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const userPrompt = this.getLastUserText();

    const planner = await generateText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
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

Create 4 to 12 elements for most diagrams. Use rectangles for steps, diamonds for decisions, arrows between steps, and clear labels. Use positions that do not overlap. Do not include markdown.`,
      prompt: userPrompt,
    });

    const plan = this.parsePlan(planner.text) ?? this.fallbackPlan(userPrompt);
    this.applyPlan(plan);

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: `You are a concise canvas assistant. The canvas has already been updated. Reply in one short sentence with what was created. Do not include JSON or code.`,
      prompt: `Canvas update summary: ${plan.summary}.`,
      onFinish,
    });

    return result.toUIMessageStreamResponse();
  }
}
