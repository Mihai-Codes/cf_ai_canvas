/**
 * ChatAgent — AI chat interface that interprets natural language
 * and orchestrates canvas operations via Workers AI (Llama 3.3).
 *
 * Users type things like "draw a flowchart of a login system" and
 * the LLM generates the appropriate MCP tool calls.
 */
import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, convertToModelMessages, pruneMessages, tool } from "ai";
import { z } from "zod";
// Env is globally available from env.d.ts

export class ChatAgent extends AIChatAgent<Env> {
  async onChatMessage() {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: `You are an AI canvas assistant. You help users create diagrams, flowcharts, and drawings on a tldraw canvas.

When the user describes what they want to draw, use the available tools to create shapes, arrows, and text on the canvas.

Guidelines:
- Use batch_create_elements for efficiency when creating multi-shape diagrams
- Space elements 150-200px apart
- Use arrows with startBoundTo/endBoundTo to connect shapes
- Choose appropriate colors: blue for processes, green for success states, red for errors, violet for decisions
- Always respond with what you created after using tools

Available shape types: rectangle, ellipse, diamond, triangle, text, arrow, line, note, frame, star, cloud, hexagon
Available colors: black, grey, blue, light-blue, violet, light-violet, red, light-red, orange, yellow, green, light-green, white`,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages",
      }),
      tools: {
        // Canvas tool — creates a single element
        create_element: tool({
          description: "Create a shape on the canvas (rectangle, ellipse, diamond, arrow, text, note, etc.)",
          inputSchema: z.object({
            type: z.enum(["rectangle", "ellipse", "diamond", "triangle", "text", "arrow", "line", "note", "frame", "star", "cloud", "hexagon"]),
            x: z.number().describe("X position"),
            y: z.number().describe("Y position"),
            width: z.number().optional().describe("Width (default: 100)"),
            height: z.number().optional().describe("Height (default: 100)"),
            text: z.string().optional().describe("Label text"),
            color: z.string().optional().describe("Color name"),
          }),
          execute: async (input) => {
            // Forward to CanvasMCP state via internal call
            // In production, this would call the DO directly
            return { success: true, element: input };
          },
        }),

        // Batch create — for multi-element diagrams
        batch_create_elements: tool({
          description: "Create multiple elements at once (efficient for diagrams). Each element needs type, x, y, and optionally width, height, text, color.",
          inputSchema: z.object({
            elements: z.array(z.object({
              type: z.enum(["rectangle", "ellipse", "diamond", "triangle", "text", "arrow", "line", "note", "frame", "star", "cloud", "hexagon"]),
              x: z.number(),
              y: z.number(),
              width: z.number().optional(),
              height: z.number().optional(),
              text: z.string().optional(),
              color: z.string().optional(),
            })),
          }),
          execute: async ({ elements }) => {
            return { success: true, created: elements.length, elements };
          },
        }),

        // Clear canvas
        clear_canvas: tool({
          description: "Clear all elements from the canvas",
          inputSchema: z.object({}),
          execute: async () => {
            return { success: true, message: "Canvas cleared" };
          },
        }),

        // Describe what's on the canvas
        describe_scene: tool({
          description: "Get a text description of what's currently on the canvas",
          inputSchema: z.object({}),
          execute: async () => {
            return { message: "Canvas description would appear here" };
          },
        }),
      },
      stopWhen: (event) => event.steps.length >= 5,
    });

    return result.toUIMessageStreamResponse();
  }
}
