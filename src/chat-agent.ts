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
import { streamText, convertToModelMessages, pruneMessages, tool } from "ai";
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

  async onChatMessage() {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: `You are an AI canvas assistant. You help users create diagrams, flowcharts, and drawings on a tldraw canvas.

When the user describes what they want to draw, use the available tools to create shapes, arrows, and text on the canvas. The canvas state updates in real-time for the user.

Guidelines:
- Use batch_create_elements for efficiency when creating multi-shape diagrams
- Space elements 150-200px apart vertically or horizontally
- Use arrows with startBoundTo/endBoundTo to connect shapes by their IDs
- Choose appropriate colors: blue for processes, green for success/data, red for errors, violet for decisions, orange for warnings
- Layout flowcharts top-to-bottom with 180px vertical spacing
- Always respond with a description of what you created

Available shape types: rectangle, ellipse, diamond, triangle, text, arrow, line, note, frame, star, cloud, hexagon
Available colors: black, grey, blue, light-blue, violet, light-violet, red, light-red, orange, yellow, green, light-green, white`,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages",
      }),
      tools: {
        // Create a single element on the canvas
        create_element: tool({
          description: "Create a shape on the canvas. Returns the created element with its ID (use for arrow connections).",
          inputSchema: z.object({
            type: ShapeTypeSchema.describe("Shape type"),
            x: z.number().describe("X position on canvas"),
            y: z.number().describe("Y position on canvas"),
            width: z.number().optional().describe("Width in pixels (default: 100)"),
            height: z.number().optional().describe("Height in pixels (default: 100)"),
            text: z.string().optional().describe("Text label inside the shape"),
            color: ColorSchema.optional().describe("Shape color (default: black)"),
            startBoundTo: z.string().optional().describe("For arrows: ID of the element this arrow starts from"),
            endBoundTo: z.string().optional().describe("For arrows: ID of the element this arrow points to"),
          }),
          execute: async (input) => {
            const element = this.createElement(input);
            const elements = { ...this.state.canvas.elements, [element.id]: element };
            this.updateCanvas(elements);
            return { id: element.id, type: element.type, text: element.text, position: { x: element.x, y: element.y } };
          },
        }),

        // Batch create multiple elements (efficient for diagrams)
        batch_create_elements: tool({
          description: "Create multiple elements at once. Much more efficient for diagrams with many shapes. Returns all created IDs.",
          inputSchema: z.object({
            elements: z.array(z.object({
              type: ShapeTypeSchema,
              x: z.number(),
              y: z.number(),
              width: z.number().optional(),
              height: z.number().optional(),
              text: z.string().optional(),
              color: ColorSchema.optional(),
              startBoundTo: z.string().optional(),
              endBoundTo: z.string().optional(),
            })).describe("Array of elements to create"),
          }),
          execute: async ({ elements: inputs }) => {
            const newElements = { ...this.state.canvas.elements };
            const created: Array<{ id: string; type: string; text?: string }> = [];

            for (const input of inputs) {
              const element = this.createElement(input);
              newElements[element.id] = element;
              created.push({ id: element.id, type: element.type, text: element.text });
            }

            this.updateCanvas(newElements);
            return { created: created.length, elements: created };
          },
        }),

        // Clear the canvas
        clear_canvas: tool({
          description: "Remove all elements from the canvas. Use when user wants to start fresh.",
          inputSchema: z.object({}),
          execute: async () => {
            this.updateCanvas({});
            return { success: true, message: "Canvas cleared" };
          },
        }),

        // Describe what's currently on the canvas
        describe_scene: tool({
          description: "Get a text summary of all elements currently on the canvas with their positions and connections.",
          inputSchema: z.object({}),
          execute: async () => {
            const elements = Object.values(this.state.canvas.elements);
            if (elements.length === 0) return { description: "Canvas is empty" };

            const sorted = [...elements].sort((a, b) => a.y - b.y || a.x - b.x);
            const summary = sorted.map(el => {
              const label = el.text ? ` "${el.text}"` : "";
              return `${el.type}${label} at (${el.x},${el.y}) [${el.color}]`;
            }).join("\n");

            const arrows = elements.filter(e => e.type === "arrow");
            const connections = arrows.map(a => {
              const from = a.start?.boundTo || "?";
              const to = a.end?.boundTo || "?";
              return `${from} → ${to}`;
            });

            return {
              elementCount: elements.length,
              elements: summary,
              connections: connections.length > 0 ? connections : undefined,
            };
          },
        }),

        // Delete a specific element
        delete_element: tool({
          description: "Delete a specific element by ID",
          inputSchema: z.object({
            id: z.string().describe("ID of the element to delete"),
          }),
          execute: async ({ id }) => {
            if (!this.state.canvas.elements[id]) {
              return { error: `Element ${id} not found` };
            }
            const { [id]: _, ...rest } = this.state.canvas.elements;
            this.updateCanvas(rest);
            return { success: true, deleted: id };
          },
        }),

        // Update an element
        update_element: tool({
          description: "Update properties of an existing element (move, resize, change color/text)",
          inputSchema: z.object({
            id: z.string().describe("Element ID to update"),
            x: z.number().optional().describe("New X position"),
            y: z.number().optional().describe("New Y position"),
            width: z.number().optional().describe("New width"),
            height: z.number().optional().describe("New height"),
            text: z.string().optional().describe("New text label"),
            color: ColorSchema.optional().describe("New color"),
          }),
          execute: async ({ id, ...updates }) => {
            const element = this.state.canvas.elements[id];
            if (!element) return { error: `Element ${id} not found` };

            const updated: CanvasElement = {
              ...element,
              ...Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined)),
              updatedAt: new Date().toISOString(),
            };
            const elements = { ...this.state.canvas.elements, [id]: updated };
            this.updateCanvas(elements);
            return { success: true, updated: { id, ...updates } };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  }
}
