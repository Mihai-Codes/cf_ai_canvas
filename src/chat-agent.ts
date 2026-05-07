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
import { DIAGRAM_PATTERNS } from "./diagram-patterns";

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



export class ChatAgent extends AIChatAgent<Env, ChatAgentState> {
  initialState: ChatAgentState = {
    canvas: {
      elements: {},
      viewportZoom: 1,
      viewportX: 0,
      viewportY: 0,
    },
  };

  override async onConnect(connection: any): Promise<void> {
    this.setState({
      ...this.state,
      canvas: { elements: {}, viewportZoom: 1, viewportX: 0, viewportY: 0 },
    });
  }

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

  // Enhanced prompt engineering to improve diagram complexity
  private enhancePrompt(prompt: string, addStructure: boolean = true): string {
    // Detect prompt complexity and add structural guidance
    const lowerPrompt = prompt.toLowerCase();
    
    // Base enhancement with spatial reasoning guidance
    let enhanced = `${prompt}\n\n`;
    
    if (addStructure) {
      enhanced += `DIAGRAM STRUCTURE GUIDANCE:\n`;
      
      // Add layout patterns based on prompt content
      if (lowerPrompt.includes('architecture') || lowerPrompt.includes('layers') || lowerPrompt.includes('tier')) {
        enhanced += `- Use hierarchical layout (top to bottom or left to right)\n`;
        enhanced += `- Group related components in visual layers\n`;
        enhanced += `- Maintain consistent vertical/horizontal alignment\n`;
      }
      
      if (lowerPrompt.includes('flow') || lowerPrompt.includes('process') || lowerPrompt.includes('steps')) {
        enhanced += `- Arrange steps in sequential order\n`;
        enhanced += `- Use equal spacing between elements (200-300px recommended)\n`;
        enhanced += `- Connect elements with directed arrows\n`;
      }
      
      if (lowerPrompt.includes('network') || lowerPrompt.includes('cloud') || lowerPrompt.includes('infrastructure')) {
        enhanced += `- Place edge services (CDN, WAF) at the top\n`;
        enhanced += `- Position core services in the middle layer\n`;
        enhanced += `- Show data flow direction with arrow heads\n`;
      }
      
      // Always add these spatial constraints
      enhanced += `SPATIAL CONSTRAINTS:\n`;
      enhanced += `- No overlapping elements. Use x/y increments of 300+ for positioning instead of 50.\n`;
      enhanced += `- Minimum 150px padding between components\n`;
      enhanced += `- Use grid-aligned positions (multiples of 200 recommended)\n`;
      enhanced += `- Keep connection lines straight and uncrossed when possible\n`;
      
      // Add visual hierarchy guidance
      enhanced += `VISUAL HIERARCHY:\n`;
      enhanced += `- Use different shapes: rectangles for services, diamonds for decisions, ellipses for start/end\n`;
      enhanced += `- Color coding: blue for primary path, green for success, red for errors, gray for secondary\n`;
      enhanced += `- Size hierarchy: important components can be 20-30% larger\n`;
      
      // Add specific coordinate examples
      enhanced += `COORDINATE EXAMPLES:\n`;
      enhanced += `- Column layout: x=100, x=500, x=900 (400px columns + 200px gutters)\n`;
      enhanced += `- Row layout: y=100, y=500, y=900 (400px rows + 200px gutters)\n`;
      enhanced += `- Grid layout: combine x and y patterns above\n`;
    }
    
    // Add output format constraints
    enhanced += `\nOUTPUT REQUIREMENTS:\n`;
    enhanced += `- Generate 4-12 elements for most diagrams\n`;
    enhanced += `- Ensure all elements have valid x, y, width, height properties\n`;
    enhanced += `- Use consistent shape types and colors\n`;
    enhanced += `- Include clear, concise labels (max 20 characters)\n`;
    enhanced += `- Connect related elements with arrows\n`;
    
    return enhanced;
  }

  private getLastUserMessage(): { text: string; hasImage: boolean; imageData?: string } {
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
            if ("text" in part && typeof part.text === "string") {
              text = part.text;
            } else if ("type" in part && part.type === "image" && "data" in part) {
              hasImage = true;
              imageData = part.data;
            }
          }
        }
      }

      if (text || hasImage) {
        return { text: text || "", hasImage, imageData };
      }
    }

    return { text: "", hasImage: false };
  }

  private parsePlan(rawText: string): { summary: string; elements: PlannedElement[] } | null {
    const trimmed = rawText.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fenced?.[1] ?? trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed;

    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed.elements)) return null;

      return {
        summary: String(parsed.summary ?? "Created a diagram on the canvas."),
        elements: parsed.elements.slice(0, 24).map((element: any) => {
          const gridCol = Number.isFinite(element.gridCol) ? element.gridCol : 0;
          const gridRow = Number.isFinite(element.gridRow) ? element.gridRow : 0;
          const x = gridCol * 300 + 100;
          const y = gridRow * 200 + 100;
          return {
            type: element.type || "rectangle",
            x,
            y,
            width: Number.isFinite(element.width) ? element.width : 120,
            height: Number.isFinite(element.height) ? element.height : 80,
            text: typeof element.text === "string" ? element.text : undefined,
            color: element.color || "blue",
            ...(element.id && { id: element.id }),
            ...(element.startBoundTo && { startBoundTo: element.startBoundTo }),
            ...(element.endBoundTo && { endBoundTo: element.endBoundTo }),
          };
        }),
      };
    } catch (error) {
      console.error("Failed to parse diagram plan:", error);
      return null;
    }
  }

  // Generate intelligent fallback diagram based on prompt analysis
  private generateFallbackDiagram(userPrompt: string): { summary: string; elements: any[] } {
    const lowerPrompt = userPrompt.toLowerCase();
    
    // Try to match with predefined patterns
    for (const pattern of DIAGRAM_PATTERNS) {
      if (pattern.keywords.some(keyword => lowerPrompt.includes(keyword))) {
        const result = pattern.generate(userPrompt);
        return {
          summary: `Created a ${pattern.name.replace(/_/g, ' ')} diagram`,
          elements: result.map(element => ({
            type: element.type as any,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            text: element.text,
            color: element.color
          }))
        };
      }
    }
    
    // If no pattern matches, analyze prompt content and generate appropriate fallback
    if (lowerPrompt.includes('login') || lowerPrompt.includes('auth') || lowerPrompt.includes('sign')) {
      const result = DIAGRAM_PATTERNS.find(p => p.name === 'login_flow')!.generate(userPrompt);
      return { summary: 'Created a login flow diagram', elements: result };
    }
    
    if (lowerPrompt.includes('cloudflare') || lowerPrompt.includes('architecture')) {
      const result = DIAGRAM_PATTERNS.find(p => p.name === 'cloudflare_architecture')!.generate(userPrompt);
      return { summary: 'Created a Cloudflare architecture diagram', elements: result };
    }
    
    if (lowerPrompt.includes('oauth') || lowerPrompt.includes('authentication flow')) {
      const result = DIAGRAM_PATTERNS.find(p => p.name === 'oauth_flow')!.generate(userPrompt);
      return { summary: 'Created an OAuth flow diagram', elements: result };
    }
    
    if (lowerPrompt.includes('microservice') || lowerPrompt.includes('api') || lowerPrompt.includes('service')) {
      const result = DIAGRAM_PATTERNS.find(p => p.name === 'microservices')!.generate(userPrompt);
      return { summary: 'Created a microservices diagram', elements: result };
    }
    
    if (lowerPrompt.includes('database') || lowerPrompt.includes('storage') || lowerPrompt.includes('data')) {
      const result = DIAGRAM_PATTERNS.find(p => p.name === 'database_schema')!.generate(userPrompt);
      return { summary: 'Created a database schema diagram', elements: result };
    }
    
    // Default fallback - use the first pattern if nothing matches
    const result = DIAGRAM_PATTERNS[0].generate(userPrompt);
    return { summary: 'Created a diagram', elements: result };
  }

  private applyPlan(plan: { summary: string; elements: PlannedElement[] } | PlannedElement[]) {
    // Overwrite nextElements rather than appending to old canvas state.
    // This ensures only the newly generated diagram renders, not both.
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

    let enhancedPrompt = this.enhancePrompt(userPrompt, hasImage);
    
    if (hasImage && imageData) {
      // Use Llama 3.2 Vision to analyze the image and extract structure
      const visionModel = workersai("@cf/meta/llama-3.2-11b-vision-instruct-fp8");
      const visionResponse = await generateText({
        model: visionModel,
        system: `You are an expert at analyzing visual diagrams and extracting their structure. 
        Describe the diagram in clear, structured text that can be used to recreate it. 
        Include all nodes, connections, labels, and spatial relationships. 
        Output format: 
        Nodes: [node1: type, position, size], [node2: ...]
        Connections: [source -> target: type, label]
        Layout: [orientation, spacing, alignment]`,
        prompt: `Analyze this diagram image and describe its structure in detail. User request: ${userPrompt}`,
      });
      enhancedPrompt = `User prompt: ${userPrompt}\n\nImage analysis: ${visionResponse.text}\n\nStructured requirements: ${this.enhancePrompt(visionResponse.text, false)}`;
    }

    const planner = await generateText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: `You are an expert diagram generation assistant with advanced spatial reasoning capabilities. 
      Convert user requests into professionally structured tldraw canvas JSON. 
      If the user provided image analysis, use it to guide your layout.

CRITICAL SPATIAL RULES:
1. USE GRID SYSTEM - Never use arbitrary x/y pixel values! Use gridRow (0,1,2...) and gridCol (0,1,2...) instead.
2. GRID SPACING - Each grid cell is 300px wide x 200px tall. Use gridCol:0, gridCol:1, gridCol:2 for horizontal spacing.
3. NO OVERLAPPING - The grid system guarantees no overlap since we convert automatically.
4. LOGICAL FLOW - Left-to-right flows use increasing gridCol, top-to-bottom use increasing gridRow.

STRUCTURED OUTPUT REQUIREMENTS:
Return ONLY valid JSON with this exact shape:
{
  "summary": "concise description of the created diagram",
  "elements": [
    {
      "type": "rectangle | ellipse | diamond | triangle | text | arrow | line | note | frame | star | cloud | hexagon",
      "id": "unique_string_id_for_this_element",
      "gridRow": 0,
      "gridCol": 0,
      "width": 180,
      "height": 80,
      "text": "clear label under 20 chars",
      "color": "black | grey | blue | light-blue | violet | light-violet | red | light-red | orange | yellow | green | light-green | white",
      "startBoundTo": "optional_id_of_source_element_for_arrows",
      "endBoundTo": "optional_id_of_target_element_for_arrows"
    }
  ]
}

IMPORTANT: Use gridRow and gridCol for positioning!
- gridRow: 0, 1, 2, 3... (vertical position)
- gridCol: 0, 1, 2, 3... (horizontal position)
- Each grid cell is 300x200 pixels - use multiples like gridCol: 0, 1, 2 for spacing
- This guarantees no overlap - we handle the pixel conversion automatically

DIAGRAM GENERATION GUIDELINES:
- Create 4-12 elements for most diagrams (target 6-8 for complexity balance)
- Use appropriate shapes: rectangles for components, diamonds for decisions, ellipses for start/end
- Implement color coding: blue=primary, green=success, red=errors, grey=secondary
- Connect related elements with arrows using startBoundTo and endBoundTo properties matching shape IDs. If no shape ID exists to bind to, define explicit X/Y absolute coordinates so the line begins and ends where expected!
- Arrange in logical layouts: left-to-right for flows, top-to-bottom for hierarchies
- Ensure all text labels fit within their containers (adjust widths if needed)
- Avoid crossed connection lines when possible
- Use frames to group related components

SPATIAL CALCULATION EXAMPLES:
- 2-column layout: x=150 and x=750 (600px width + 200px gutter)
- 3-column layout: x=100, x=700, x=1300 (500px columns + 200px gutters)
- Row spacing: y=100, y=500, y=900 (300px height + 200px gutters)
- Decision branches: place alternatives below with clear arrow paths

Do not include markdown. Focus on creating clean, professional, non-overlapping layouts. Use HUGE distances!`,
      prompt: enhancedPrompt,
    });

    const parsedPlan = this.parsePlan(planner.text);
    const plan = parsedPlan ?? this.generateFallbackDiagram(userPrompt);
    const summary = parsedPlan ? parsedPlan.summary : "Created a diagram on the canvas.";
    this.applyPlan(plan);

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: `You are a concise canvas assistant. The canvas has already been updated. Reply in one short sentence with what was created. Do not include JSON or code.`,
      prompt: `Canvas update summary: ${summary}.`,
      onFinish,
    });

    return result.toUIMessageStreamResponse();
  }
}