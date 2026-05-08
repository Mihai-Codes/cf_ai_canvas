import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, streamText } from "ai";
import { z } from "zod";
import dagre from "dagre";
import type { CanvasElement, CanvasState } from "./types";
import { DIAGRAM_PATTERNS } from "./diagram-patterns";

const RANKSEP = 200;
const NODE_SEP = 150;
const MARGIN_X = 20;
const MARGIN_Y = 20;

type SemElement = {
  id: string;
  type: string;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  startBoundTo?: string;
  endBoundTo?: string;
};

type PlannedElement = {
  id?: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  fill?: string;
  startBoundTo?: string;
  endBoundTo?: string;
};

function computeLayout(elements: SemElement[]): Array<{
  id: string;
  x: number;
  y: number;
  rank: number;
  width: number;
  height: number;
}> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    nodesep: NODE_SEP,
    ranksep: RANKSEP,
    marginx: MARGIN_X,
    marginy: MARGIN_Y,
    align: "UL",
    edgesep: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Only non-arrow elements become nodes in the layout graph
  const nodes = elements.filter((e) => e.type !== "arrow" && e.type !== "line");

  // Add nodes to Dagre
  nodes.forEach((n) => {
    const w = n.width ?? 120;
    const h = n.height ?? 60;
    g.setNode(n.id, { width: w, height: h });
  });

  // Add edges for arrow connections (note: these are NOT nodes themselves)
  elements.forEach((e) => {
    if (
      (e.type === "arrow" || e.type === "line") &&
      e.startBoundTo &&
      e.endBoundTo
    ) {
      g.setEdge(e.startBoundTo, e.endBoundTo);
    }
  });

  dagre.layout(g);

  // Return positions for nodes only
  return nodes.map((n) => {
    const w = n.width ?? 120;
    const h = n.height ?? 60;
    const raw = g.node(n.id) as any;
    if (!raw)
      return {
        id: n.id,
        x: MARGIN_X,
        y: MARGIN_Y,
        rank: 0,
        width: w,
        height: h,
      };
    return {
      id: n.id,
      x: raw.x - w / 2,
      y: raw.y - h / 2,
      rank: raw.rank ?? 0,
      width: w,
      height: h,
    };
  });
}

export class ChatAgent extends AIChatAgent<Env, { canvas: CanvasState }> {
  initialState = {
    canvas: {
      elements: {},
      viewportZoom: 1,
      viewportX: 0,
      viewportY: 0,
      generationId: 0,
    },
  };

  override async onStart(): Promise<void> {
    if (this.messages.length === 0) {
      const welcomeMessage = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: 'Welcome! I can help you create diagrams on the canvas. Try prompts like "draw a login flow" or "create a Cloudflare architecture diagram". You can also attach images for multimodal diagram generation.',
          },
        ],
      };
      await this.saveMessages([welcomeMessage]);
    }
  }

  // onConnect intentionally left empty — canvas state must persist across
  // WebSocket reconnections (DO hibernation during LLM calls causes reconnects).

  private parseAndLayout(
    rawText: string,
  ): { summary: string; elements: PlannedElement[] } | null {
    const trimmed = rawText.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText =
      fenced?.[1] ?? trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed;
    const LLMOutputSchema = z.object({
      summary: z.string().optional(),
      elements: z.array(
        z.object({
          id: z.string().optional(),
          type: z.string(),
          width: z.number().optional(),
          height: z.number().optional(),
          text: z.string().optional(),
          color: z.string().optional(),
          startBoundTo: z.string().optional(),
          endBoundTo: z.string().optional(),
        }),
      ),
    });
    try {
      const parsed = LLMOutputSchema.parse(JSON.parse(jsonText));
      const summary = parsed.summary ?? "Created a diagram on the canvas.";
      let idCounter = 0;
      const semElements: SemElement[] = [];
      const arrowElements: SemElement[] = [];
      for (const el of parsed.elements.slice(0, 24)) {
        const id = el.id ?? `elem_${++idCounter}`;
        const semEl: SemElement = {
          id,
          type: el.type,
          width: el.width,
          height: el.height,
          text: el.text,
          color: el.color,
          startBoundTo: el.startBoundTo,
          endBoundTo: el.endBoundTo,
        };
        if (el.type === "arrow" || el.type === "line") {
          arrowElements.push(semEl);
        } else {
          semElements.push(semEl);
        }
      }
      // Compute layout positions for nodes only
      const positions = computeLayout(semElements);
      const posMap = new Map(positions.map((p) => [p.id, p]));
      // Merge positions for nodes, and assign placeholder positions for arrows
      const planned: PlannedElement[] = [
        ...semElements.map((sem) => {
          const pos = posMap.get(sem.id)!;
          return {
            id: sem.id,
            type: sem.type,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
            text: sem.text,
            color: sem.color ?? "blue",
            startBoundTo: sem.startBoundTo,
            endBoundTo: sem.endBoundTo,
          };
        }),
        ...arrowElements.map((arrow) => {
          // For arrows, try to compute midpoint between connected nodes as initial position
          const startId = arrow.startBoundTo;
          const endId = arrow.endBoundTo;
          let x = MARGIN_X;
          let y = MARGIN_Y;
          if (startId && posMap.has(startId) && endId && posMap.has(endId)) {
            const start = posMap.get(startId)!;
            const end = posMap.get(endId)!;
            x = (start.x + end.x) / 2 - (arrow.width ?? 60) / 2;
            y = (start.y + end.y) / 2 - (arrow.height ?? 4) / 2;
          }
          return {
            id: arrow.id,
            type: arrow.type,
            x,
            y,
            width: arrow.width ?? 60,
            height: arrow.height ?? 4,
            text: arrow.text,
            color: arrow.color ?? "blue",
            startBoundTo: arrow.startBoundTo,
            endBoundTo: arrow.endBoundTo,
          };
        }),
      ];
      return { summary, elements: planned };
    } catch (error) {
      console.error("Failed to parse/layout diagram:", error);
      return null;
    }
  }

  private generateFallbackDiagram(userPrompt: string): {
    summary: string;
    elements: PlannedElement[];
  } {
    const lowerPrompt = userPrompt.toLowerCase();
    let patternName: string | null = null;

    // First pass: check explicit keyword overrides (most specific wins)
    if (
      lowerPrompt.includes("login") ||
      lowerPrompt.includes("sign in") ||
      lowerPrompt.includes("sign-in") ||
      lowerPrompt.includes("credentials")
    ) {
      patternName = "login_flow";
    } else if (
      lowerPrompt.includes("cloudflare") ||
      (lowerPrompt.includes("workers") && lowerPrompt.includes("ai"))
    ) {
      patternName = "cloudflare_architecture";
    } else if (
      lowerPrompt.includes("oauth") ||
      lowerPrompt.includes("authorization code")
    ) {
      patternName = "oauth_flow";
    } else if (
      lowerPrompt.includes("microservice") ||
      (lowerPrompt.includes("api gateway") && lowerPrompt.includes("service"))
    ) {
      patternName = "microservices";
    } else if (
      lowerPrompt.includes("data pipeline") ||
      lowerPrompt.includes("etl") ||
      (lowerPrompt.includes("warehouse") && lowerPrompt.includes("transform"))
    ) {
      patternName = "data_flow";
    }

    // Second pass: fall back to pattern keyword matching
    if (!patternName) {
      for (const pattern of DIAGRAM_PATTERNS) {
        if (pattern.keywords.some((keyword) => lowerPrompt.includes(keyword))) {
          patternName = pattern.name;
          break;
        }
      }
    }

    // Default to first pattern if nothing matched
    const pattern = DIAGRAM_PATTERNS.find(
      (p) => p.name === (patternName ?? DIAGRAM_PATTERNS[0].name),
    ) ?? DIAGRAM_PATTERNS[0];
    const rawElements = pattern.generate(userPrompt);

    // Grid constants — 280px column width, 170px row height, 50px origin
    const COL_W = 280;
    const ROW_H = 170;
    const OX = 50;
    const OY = 50;

    // Pass 1: assign x/y to all nodes from gridCol/gridRow
    const nodePosMap = new Map<
      string,
      { x: number; y: number; w: number; h: number }
    >();
    let fallbackId = 0;
    const nodeElems: PlannedElement[] = [];
    const arrowElems: PlannedElement[] = [];

    for (const el of rawElements) {
      const id = el.id ?? `fb_${++fallbackId}`;
      const w = el.width ?? 160;
      const h = el.height ?? 70;
      if (el.type !== "arrow" && el.type !== "line") {
        const x = OX + (el.gridCol ?? 0) * COL_W;
        const y = OY + (el.gridRow ?? 0) * ROW_H;
        nodePosMap.set(id, { x, y, w, h });
        nodeElems.push({ ...el, id, x, y, width: w, height: h });
      } else {
        arrowElems.push({ ...el, id, x: 0, y: 0 });
      }
    }

    // Pass 2: position each arrow at the midpoint between its bound nodes
    for (const arrow of arrowElems) {
      let x = OX;
      let y = OY;
      const s = arrow.startBoundTo
        ? nodePosMap.get(arrow.startBoundTo)
        : undefined;
      const e = arrow.endBoundTo ? nodePosMap.get(arrow.endBoundTo) : undefined;
      if (s && e) {
        x = (s.x + s.w / 2 + e.x + e.w / 2) / 2;
        y = (s.y + s.h / 2 + e.y + e.h / 2) / 2;
      }
      nodeElems.push({
        ...arrow,
        x,
        y,
        width: arrow.width ?? 60,
        height: arrow.height ?? 4,
      });
    }

    return {
      summary: `Created a ${patternName.replace(/_/g, " ")} diagram`,
      elements: nodeElems,
    };
  }

  private createElement(input: {
    id?: string;
    type: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    text?: string;
    color?: string;
    fill?: string;
    startBoundTo?: string;
    endBoundTo?: string;
  }): CanvasElement {
    const id = input.id || crypto.randomUUID();
    const now = new Date().toISOString();
    return {
      id,
      type: input.type as CanvasElement["type"],
      x: input.x,
      y: input.y,
      width: input.width ?? 150,
      height: input.height ?? 100,
      text: input.text,
      color: (input.color as CanvasElement["color"]) ?? "black",
      fill: (input.fill as CanvasElement["fill"]) ?? "none",
      dash: "draw",
      size: "m",
      font: "draw",
      start: input.startBoundTo
        ? { x: input.x, y: input.y, boundTo: input.startBoundTo }
        : undefined,
      end: input.endBoundTo
        ? {
            x: input.x + (input.width ?? 100),
            y: input.y,
            boundTo: input.endBoundTo,
          }
        : undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  private updateCanvas(elements: Record<string, CanvasElement>) {
    this.setState({
      ...this.state,
      canvas: {
        ...this.state.canvas,
        elements,
        generationId: (this.state.canvas.generationId ?? 0) + 1,
      },
    });
  }

  private enhancePrompt(prompt: string, addStructure: boolean = true): string {
    const lowerPrompt = prompt.toLowerCase();
    let enhanced = `${prompt}\n\n`;

    if (addStructure) {
      enhanced += "DIAGRAM STRUCTURE GUIDANCE:\n";
      if (
        lowerPrompt.includes("architecture") ||
        lowerPrompt.includes("layers") ||
        lowerPrompt.includes("tier")
      ) {
        enhanced += "- Use hierarchical left-to-right layout\n";
        enhanced += "- Group related components in visual layers\n";
        enhanced += "- Maintain consistent vertical/horizontal alignment\n";
      }
      if (
        lowerPrompt.includes("flow") ||
        lowerPrompt.includes("process") ||
        lowerPrompt.includes("steps")
      ) {
        enhanced += "- Arrange steps in sequential order\n";
        enhanced += "- Connect elements with directed arrows\n";
      }
      if (
        lowerPrompt.includes("network") ||
        lowerPrompt.includes("cloud") ||
        lowerPrompt.includes("infrastructure")
      ) {
        enhanced += "- Place edge services at the top\n";
        enhanced += "- Position core services in the middle\n";
        enhanced += "- Show data flow direction with arrow heads\n";
      }
      enhanced += "\nVISUAL HIERARCHY:\n";
      enhanced +=
        "- Use different shapes: rectangles for services, diamonds for decisions, ellipses for start/end\n";
      enhanced +=
        "- Color coding: blue=primary, green=success, red=errors, gray=secondary\n";
      enhanced += "- Size hierarchy: important components can be larger\n";
    }

    enhanced += "\nOUTPUT REQUIREMENTS:\n";
    enhanced += "- Generate 4-12 elements for most diagrams\n";
    enhanced +=
      "- Ensure all elements have valid type, text, color properties\n";
    enhanced +=
      "- Connect elements with arrows using startBoundTo and endBoundTo IDs\n";
    enhanced += "- Include clear, concise labels\n";

    return enhanced;
  }

  private getLastUserMessage(): {
    text: string;
    hasImage: boolean;
    imageData?: string;
  } {
    for (let index = this.messages.length - 1; index >= 0; index--) {
      const message = this.messages[index] as any;
      if (message.role !== "user") continue;

      let text = "";
      let hasImage = false;
      let imageData: string | undefined;

      if (typeof message.content === "string") {
        text = message.content;
      } else if (Array.isArray(message.parts)) {
        for (const part of message.parts) {
          if (typeof part === "object" && part !== null) {
            if ("text" in part && typeof part.text === "string")
              text = part.text;
            else if (
              "type" in part &&
              part.type === "image" &&
              "data" in part
            ) {
              hasImage = true;
              imageData = part.data;
            }
          }
        }
      }

      // Also check for files (e.g., attached images)
      if (message.files && Array.isArray(message.files)) {
        for (const file of message.files) {
          if (file.mediaType?.startsWith("image/")) {
            hasImage = true;
            imageData = file.url;
            if (!text) {
              text = "Image attached";
            }
          }
        }
      }

      if (text || hasImage) return { text: text || "", hasImage, imageData };
    }
    return { text: "", hasImage: false };
  }

  private applyPlan(
    plan: { summary: string; elements: PlannedElement[] } | PlannedElement[],
  ) {
    const nextElements: Record<string, CanvasElement> = {};
    const elements = Array.isArray(plan) ? plan : plan.elements;
    for (const input of elements) {
      const element = this.createElement(input);
      nextElements[element.id] = element;
    }
    this.updateCanvas(nextElements);
  }

  async onChatMessage(onFinish?: any) {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text: userPrompt, hasImage, imageData } = this.getLastUserMessage();
    const promptText = userPrompt || "diagram";

    console.log("[ChatAgent] Starting generation:", {
      promptLength: promptText.length,
      hasImage,
      messageCount: this.messages.length,
    });

    // Clear canvas immediately (server-side, no client race condition)
    // This also increments generationId so even identical shapes re-render on the client.
    this.updateCanvas({});
    console.log("[ChatAgent] Canvas cleared, generationId incremented");

    // Build enhanced prompt; handle vision with graceful fallback (never return early)
    let enhancedPrompt = this.enhancePrompt(promptText, true);
    if (hasImage && imageData) {
      try {
        // Handle both data URLs (data:image/png;base64,...) and raw base64
        const b64 = imageData.includes(",")
          ? imageData.split(",")[1]
          : imageData;
        if (!b64) {
          console.warn("[ChatAgent] Invalid image data format, skipping vision");
        } else {
          console.log("[ChatAgent] Running vision analysis on attached image...");
          const visionResponse = await this.env.AI.run(
            "@cf/meta/llama-3.2-11b-vision-instruct",
            {
              prompt: `Analyze this diagram image and describe its structure. User request: ${promptText}`,
              image_b64: b64,
            },
          );
          const visionText = (visionResponse as any).result?.response ?? "";
          if (visionText) {
            console.log(
              "[ChatAgent] Vision analysis successful, enhancing prompt with image context",
            );
            enhancedPrompt = `User prompt: ${promptText}\n\nImage analysis: ${visionText}\n\n${this.enhancePrompt(visionText, false)}`;
          }
        }
      } catch (_err) {
        // Vision unavailable — continue with text-only generation, never bail
        console.error("Vision analysis failed, using text-only:", _err);
      }
    }

    // Generate diagram plan — always produces output via fallback on LLM failure
    let plan: { summary: string; elements: PlannedElement[] };
    try {
      console.log("[ChatAgent] Calling Llama 3.3 for diagram planning...");
      const planner = await generateText({
        model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
        system: `You are an expert diagram generation assistant.
Convert user requests into a structured semantic description of the diagram.

CRITICAL: Do NOT output any coordinates. Do NOT output gridCol or gridRow.
Your job is to describe WHAT to draw, not WHERE to place it.
The server handles all positioning automatically.

STRUCTURED OUTPUT REQUIREMENTS:
Return ONLY valid JSON with this exact shape:
{
  "summary": "concise description of the created diagram",
  "elements": [
    {
      "type": "rectangle | ellipse | diamond | triangle | text | arrow | line | note | frame | star | cloud | hexagon",
      "id": "unique_string_id_for_this_element",
      "width": 180,
      "height": 80,
      "text": "clear label under 20 chars",
      "color": "black | grey | blue | light-blue | violet | light-violet | red | light-red | orange | yellow | green | light-green | white",
      "startBoundTo": "optional_id_of_source_element_for_arrows",
      "endBoundTo": "optional_id_of_target_element_for_arrows"
    }
  ]
}

DIAGRAM GENERATION GUIDELINES:
- Create 4-12 elements for most diagrams (target 6-8 for complexity balance)
- Use appropriate shapes: rectangles for components, diamonds for decisions, ellipses for start/end
- Implement color coding: blue=primary, green=success, red=errors, grey=secondary
- Connect elements with arrows using startBoundTo and endBoundTo properties matching shape IDs.
Use meaningful IDs like "user", "auth", "db" instead of random strings.
- Avoid crossed connection lines by ordering elements logically
- DO NOT include any x, y, gridCol, gridRow properties — the server computes all positions

Do not include markdown. Focus on creating clean, professional diagrams.`,
        prompt: enhancedPrompt,
      });
      console.log("[ChatAgent] LLM response received, parsing...");
      // ?? only catches null/undefined; also fall back when LLM returns {elements:[]}
      const parsed = this.parseAndLayout(planner.text);
      console.log("[ChatAgent] Parsed elements:", parsed?.elements.length ?? 0);
      plan =
        parsed && parsed.elements.length > 0
          ? parsed
          : this.generateFallbackDiagram(promptText);
    } catch (_err) {
      console.error("LLM planning failed, using fallback diagram:", _err);
      plan = this.generateFallbackDiagram(promptText);
    }

    console.log("[ChatAgent] Applying plan with", plan.elements.length, "elements");
    this.applyPlan(plan);
    console.log("[ChatAgent] Canvas updated, generationId:", this.state.canvas.generationId);

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system:
        "You are a concise canvas assistant. The canvas has already been updated. Reply in one short sentence with what was created. Do not include JSON or code.",
      prompt: `Canvas update summary: ${plan.summary}.`,
      onFinish,
    });

    return result.toUIMessageStreamResponse();
  }
}
