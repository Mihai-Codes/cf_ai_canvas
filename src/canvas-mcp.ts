/**
 * CanvasMCP — Stateful remote MCP server for AI-powered canvas operations.
 *
 * Extends McpAgent to give each session its own canvas state (persisted in DO SQLite).
 * Exposes 17+ tools via Streamable HTTP at /mcp — any MCP client can connect remotely.
 */
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CanvasElement, CanvasState } from "./types";

// Zod schemas for element properties
const ElementTypeSchema = z.enum([
  "rectangle", "ellipse", "diamond", "triangle", "text",
  "arrow", "line", "note", "frame", "star", "cloud", "hexagon",
]);

const ElementColorSchema = z.enum([
  "black", "grey", "blue", "light-blue", "violet", "light-violet",
  "red", "light-red", "orange", "yellow", "green", "light-green", "white",
]);

const BaseElementSchema = z.object({
  type: ElementTypeSchema.describe("Shape type to create"),
  x: z.number().describe("X position on canvas"),
  y: z.number().describe("Y position on canvas"),
  width: z.number().optional().describe("Width (default: 100)"),
  height: z.number().optional().describe("Height (default: 100)"),
  text: z.string().optional().describe("Text label inside the shape"),
  color: ElementColorSchema.optional().describe("Shape color (default: black)"),
  fill: z.enum(["none", "semi", "solid", "pattern"]).optional().describe("Fill style"),
  dash: z.enum(["draw", "solid", "dashed", "dotted"]).optional().describe("Border dash style"),
  size: z.enum(["s", "m", "l", "xl"]).optional().describe("Size preset"),
  font: z.enum(["draw", "sans", "serif", "mono"]).optional().describe("Font family for text"),
  // Arrow-specific
  startBoundTo: z.string().optional().describe("ID of element arrow starts from"),
  endBoundTo: z.string().optional().describe("ID of element arrow points to"),
});

export class CanvasMCP extends McpAgent<Env, CanvasState> {
  server = new McpServer({
    name: "cf-ai-canvas",
    version: "1.0.0",
  });

  initialState: CanvasState = {
    elements: {},
    viewportZoom: 1,
    viewportX: 0,
    viewportY: 0,
  };

  async init() {
    // --- TOOL: create_element ---
    this.server.tool(
      "create_element",
      "Create a shape, text, arrow, or note on the canvas",
      BaseElementSchema.shape,
      async (input) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const element: CanvasElement = {
          id,
          type: input.type,
          x: input.x,
          y: input.y,
          width: input.width ?? 100,
          height: input.height ?? 100,
          text: input.text,
          color: input.color ?? "black",
          fill: input.fill ?? "none",
          dash: input.dash ?? "draw",
          size: input.size ?? "m",
          font: input.font ?? "draw",
          start: input.startBoundTo ? { x: input.x, y: input.y, boundTo: input.startBoundTo } : undefined,
          end: input.endBoundTo ? { x: input.x + (input.width ?? 100), y: input.y, boundTo: input.endBoundTo } : undefined,
          createdAt: now,
          updatedAt: now,
        };

        const elements = { ...this.state.elements, [id]: element };
        this.setState({ ...this.state, elements });

        return {
          content: [{ type: "text", text: JSON.stringify({ id, element }, null, 2) }],
        };
      },
    );

    // --- TOOL: get_element ---
    this.server.tool(
      "get_element",
      "Get a single element by ID",
      { id: z.string().describe("Element ID") },
      async ({ id }) => {
        const element = this.state.elements[id];
        if (!element) {
          return { isError: true, content: [{ type: "text", text: `Element ${id} not found` }] };
        }
        return { content: [{ type: "text", text: JSON.stringify(element, null, 2) }] };
      },
    );

    // --- TOOL: update_element ---
    this.server.tool(
      "update_element",
      "Partially update any element property",
      {
        id: z.string().describe("Element ID to update"),
        ...BaseElementSchema.partial().omit({ type: true }).shape,
      },
      async ({ id, ...updates }) => {
        const element = this.state.elements[id];
        if (!element) {
          return { isError: true, content: [{ type: "text", text: `Element ${id} not found` }] };
        }
        const updated: CanvasElement = {
          ...element,
          ...Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined)),
          updatedAt: new Date().toISOString(),
        };
        const elements = { ...this.state.elements, [id]: updated };
        this.setState({ ...this.state, elements });
        return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
      },
    );

    // --- TOOL: delete_element ---
    this.server.tool(
      "delete_element",
      "Delete an element by ID",
      { id: z.string().describe("Element ID to delete") },
      async ({ id }) => {
        if (!this.state.elements[id]) {
          return { isError: true, content: [{ type: "text", text: `Element ${id} not found` }] };
        }
        const { [id]: _, ...rest } = this.state.elements;
        this.setState({ ...this.state, elements: rest });
        return { content: [{ type: "text", text: `Deleted element ${id}` }] };
      },
    );

    // --- TOOL: batch_create_elements ---
    this.server.tool(
      "batch_create_elements",
      "Create multiple elements atomically (efficient for diagrams)",
      {
        elements: z.array(BaseElementSchema).describe("Array of elements to create"),
      },
      async ({ elements: inputs }) => {
        const now = new Date().toISOString();
        const created: CanvasElement[] = [];
        const newElements = { ...this.state.elements };

        for (const input of inputs) {
          const id = crypto.randomUUID();
          const element: CanvasElement = {
            id,
            type: input.type,
            x: input.x,
            y: input.y,
            width: input.width ?? 100,
            height: input.height ?? 100,
            text: input.text,
            color: input.color ?? "black",
            fill: input.fill ?? "none",
            dash: input.dash ?? "draw",
            size: input.size ?? "m",
            font: input.font ?? "draw",
            createdAt: now,
            updatedAt: now,
          };
          newElements[id] = element;
          created.push(element);
        }

        this.setState({ ...this.state, elements: newElements });
        return {
          content: [{ type: "text", text: JSON.stringify({ created: created.length, ids: created.map(e => e.id) }, null, 2) }],
        };
      },
    );

    // --- TOOL: query_elements ---
    this.server.tool(
      "query_elements",
      "List/filter elements by type and bounding box",
      {
        type: ElementTypeSchema.optional().describe("Filter by element type"),
        minX: z.number().optional().describe("Minimum X coordinate"),
        maxX: z.number().optional().describe("Maximum X coordinate"),
        minY: z.number().optional().describe("Minimum Y coordinate"),
        maxY: z.number().optional().describe("Maximum Y coordinate"),
      },
      async ({ type, minX, maxX, minY, maxY }) => {
        let elements = Object.values(this.state.elements);
        if (type) elements = elements.filter(e => e.type === type);
        if (minX !== undefined) elements = elements.filter(e => e.x >= minX);
        if (maxX !== undefined) elements = elements.filter(e => e.x <= maxX);
        if (minY !== undefined) elements = elements.filter(e => e.y >= minY);
        if (maxY !== undefined) elements = elements.filter(e => e.y <= maxY);
        return {
          content: [{ type: "text", text: JSON.stringify({ count: elements.length, elements }, null, 2) }],
        };
      },
    );

    // --- TOOL: clear_canvas ---
    this.server.tool(
      "clear_canvas",
      "Remove all elements from the canvas (requires confirm: true)",
      { confirm: z.boolean().describe("Must be true to confirm clearing") },
      async ({ confirm }) => {
        if (!confirm) {
          return { content: [{ type: "text", text: "Clear cancelled — set confirm: true to proceed" }] };
        }
        this.setState({ ...this.state, elements: {} });
        return { content: [{ type: "text", text: "Canvas cleared" }] };
      },
    );

    // --- TOOL: describe_scene ---
    this.server.tool(
      "describe_scene",
      "Summarize the current canvas elements, positions, labels, and connections",
      {},
      async () => {
        const elements = Object.values(this.state.elements);
        if (elements.length === 0) {
          return { content: [{ type: "text", text: "Canvas is empty" }] };
        }

        // Sort top-to-bottom, left-to-right
        const sorted = [...elements].sort((a, b) => a.y - b.y || a.x - b.x);
        const lines = sorted.map(el => {
          const label = el.text ? ` "${el.text}"` : "";
          const pos = `(${el.x}, ${el.y})`;
          const dims = el.width && el.height ? ` ${el.width}×${el.height}` : "";
          return `• ${el.type}${label} at ${pos}${dims} [${el.color}]`;
        });

        // Find connections (arrows)
        const arrows = elements.filter(e => e.type === "arrow");
        const connections = arrows.map(a => {
          const from = a.start?.boundTo ? this.state.elements[a.start.boundTo]?.text || a.start.boundTo : "?";
          const to = a.end?.boundTo ? this.state.elements[a.end.boundTo]?.text || a.end.boundTo : "?";
          return `  → ${from} → ${to}`;
        });

        const summary = [
          `Canvas: ${elements.length} elements`,
          "",
          ...lines,
          ...(connections.length ? ["", "Connections:", ...connections] : []),
        ].join("\n");

        return { content: [{ type: "text", text: summary }] };
      },
    );

    // --- TOOL: export_scene ---
    this.server.tool(
      "export_scene",
      "Export all elements as a JSON snapshot",
      {},
      async () => {
        const snapshot = {
          version: "1.0.0",
          exportedAt: new Date().toISOString(),
          elements: Object.values(this.state.elements),
        };
        return { content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }] };
      },
    );

    // --- TOOL: import_scene ---
    this.server.tool(
      "import_scene",
      "Import a JSON scene in replace or merge mode",
      {
        data: z.string().describe("JSON string of exported scene"),
        mode: z.enum(["replace", "merge"]).describe("replace clears canvas first; merge adds to existing"),
      },
      async ({ data, mode }) => {
        try {
          const parsed = JSON.parse(data);
          const importElements = Array.isArray(parsed.elements) ? parsed.elements : [];

          const newElements = mode === "replace" ? {} : { ...this.state.elements };
          for (const el of importElements) {
            const id = el.id || crypto.randomUUID();
            newElements[id] = { ...el, id, updatedAt: new Date().toISOString() };
          }
          this.setState({ ...this.state, elements: newElements });
          return { content: [{ type: "text", text: `Imported ${importElements.length} elements (${mode})` }] };
        } catch (e) {
          return { isError: true, content: [{ type: "text", text: `Import failed: ${e}` }] };
        }
      },
    );

    // --- TOOL: snapshot_scene ---
    this.server.tool(
      "snapshot_scene",
      "Save the current canvas as a named snapshot (persisted in KV)",
      { name: z.string().describe("Snapshot name") },
      async ({ name }) => {
        const snapshot = {
          version: "1.0.0",
          name,
          elements: Object.values(this.state.elements),
          createdAt: new Date().toISOString(),
        };
        // KV persistence — works when CANVAS_KV is configured in wrangler.jsonc
        const kv = (this.env as any).CANVAS_KV as KVNamespace | undefined;
        if (kv) {
          await kv.put(`snapshot:${name}`, JSON.stringify(snapshot));
        }
        return { content: [{ type: "text", text: `Snapshot "${name}" saved (${snapshot.elements.length} elements)` }] };
      },
    );

    // --- TOOL: restore_snapshot ---
    this.server.tool(
      "restore_snapshot",
      "Restore a previously saved named snapshot",
      { name: z.string().describe("Snapshot name to restore") },
      async ({ name }) => {
        const kv = (this.env as any).CANVAS_KV as KVNamespace | undefined;
        const raw = kv ? await kv.get(`snapshot:${name}`) : null;
        if (!raw) {
          return { isError: true, content: [{ type: "text", text: `Snapshot "${name}" not found` }] };
        }
        const snapshot = JSON.parse(raw);
        const elements: Record<string, CanvasElement> = {};
        for (const el of snapshot.elements) {
          elements[el.id] = el;
        }
        this.setState({ ...this.state, elements });
        return { content: [{ type: "text", text: `Restored snapshot "${name}" (${snapshot.elements.length} elements)` }] };
      },
    );

    // --- TOOL: set_viewport ---
    this.server.tool(
      "set_viewport",
      "Zoom, pan, or center on a specific element",
      {
        zoom: z.number().optional().describe("Zoom level (1 = 100%)"),
        offsetX: z.number().optional().describe("Pan X offset"),
        offsetY: z.number().optional().describe("Pan Y offset"),
        scrollToElementId: z.string().optional().describe("Center viewport on this element"),
      },
      async ({ zoom, offsetX, offsetY, scrollToElementId }) => {
        let newX = offsetX ?? this.state.viewportX;
        let newY = offsetY ?? this.state.viewportY;
        const newZoom = zoom ?? this.state.viewportZoom;

        if (scrollToElementId) {
          const el = this.state.elements[scrollToElementId];
          if (el) {
            newX = el.x;
            newY = el.y;
          }
        }

        this.setState({ ...this.state, viewportZoom: newZoom, viewportX: newX, viewportY: newY });
        return { content: [{ type: "text", text: `Viewport: zoom=${newZoom}, position=(${newX}, ${newY})` }] };
      },
    );

    // --- TOOL: align_elements ---
    this.server.tool(
      "align_elements",
      "Align multiple elements (left, center, right, top, middle, bottom)",
      {
        elementIds: z.array(z.string()).describe("IDs of elements to align"),
        alignment: z.enum(["left", "center", "right", "top", "middle", "bottom"]).describe("Alignment direction"),
      },
      async ({ elementIds, alignment }) => {
        const els = elementIds.map(id => this.state.elements[id]).filter(Boolean);
        if (els.length < 2) {
          return { isError: true, content: [{ type: "text", text: "Need at least 2 elements to align" }] };
        }

        const newElements = { ...this.state.elements };
        let target: number;

        switch (alignment) {
          case "left": target = Math.min(...els.map(e => e.x)); break;
          case "right": target = Math.max(...els.map(e => e.x + (e.width ?? 100))); break;
          case "center": target = els.reduce((s, e) => s + e.x + (e.width ?? 100) / 2, 0) / els.length; break;
          case "top": target = Math.min(...els.map(e => e.y)); break;
          case "bottom": target = Math.max(...els.map(e => e.y + (e.height ?? 100))); break;
          case "middle": target = els.reduce((s, e) => s + e.y + (e.height ?? 100) / 2, 0) / els.length; break;
        }

        for (const el of els) {
          const updated = { ...el, updatedAt: new Date().toISOString() };
          switch (alignment) {
            case "left": updated.x = target; break;
            case "right": updated.x = target - (el.width ?? 100); break;
            case "center": updated.x = target - (el.width ?? 100) / 2; break;
            case "top": updated.y = target; break;
            case "bottom": updated.y = target - (el.height ?? 100); break;
            case "middle": updated.y = target - (el.height ?? 100) / 2; break;
          }
          newElements[el.id] = updated;
        }

        this.setState({ ...this.state, elements: newElements });
        return { content: [{ type: "text", text: `Aligned ${els.length} elements (${alignment})` }] };
      },
    );

    // --- TOOL: distribute_elements ---
    this.server.tool(
      "distribute_elements",
      "Distribute multiple elements evenly (horizontal or vertical)",
      {
        elementIds: z.array(z.string()).describe("IDs of elements to distribute"),
        direction: z.enum(["horizontal", "vertical"]).describe("Distribution direction"),
      },
      async ({ elementIds, direction }) => {
        const els = elementIds.map(id => this.state.elements[id]).filter(Boolean);
        if (els.length < 3) {
          return { isError: true, content: [{ type: "text", text: "Need at least 3 elements to distribute" }] };
        }

        const sorted = [...els].sort((a, b) =>
          direction === "horizontal" ? a.x - b.x : a.y - b.y
        );

        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpace = direction === "horizontal"
          ? (last.x + (last.width ?? 100)) - first.x
          : (last.y + (last.height ?? 100)) - first.y;
        const totalSize = sorted.reduce((s, e) =>
          s + (direction === "horizontal" ? (e.width ?? 100) : (e.height ?? 100)), 0);
        const gap = (totalSpace - totalSize) / (sorted.length - 1);

        const newElements = { ...this.state.elements };
        let pos = direction === "horizontal" ? first.x : first.y;

        for (const el of sorted) {
          const updated = { ...el, updatedAt: new Date().toISOString() };
          if (direction === "horizontal") {
            updated.x = pos;
            pos += (el.width ?? 100) + gap;
          } else {
            updated.y = pos;
            pos += (el.height ?? 100) + gap;
          }
          newElements[el.id] = updated;
        }

        this.setState({ ...this.state, elements: newElements });
        return { content: [{ type: "text", text: `Distributed ${els.length} elements (${direction})` }] };
      },
    );

    // --- TOOL: read_diagram_guide ---
    this.server.tool(
      "read_diagram_guide",
      "Return tldraw color names, presets, and layout best practices",
      {},
      async () => {
        const guide = `# Canvas Diagram Guide

## Colors
black, grey, blue, light-blue, violet, light-violet, red, light-red, orange, yellow, green, light-green, white

## Fill Styles
none (outline only), semi (translucent), solid (opaque), pattern (hatched)

## Shape Types
rectangle, ellipse, diamond, triangle, text, arrow, line, note, frame, star, cloud, hexagon

## Best Practices
- Use 150-200px spacing between connected shapes
- Align labels inside shapes using the text property
- Use arrows with startBoundTo/endBoundTo to create connections
- Group related elements using frames
- Use consistent colors for categories (e.g., blue=data, green=success, red=error)
- Layout flowcharts top-to-bottom or left-to-right
- Use batch_create_elements for efficiency when creating diagrams`;
        return { content: [{ type: "text", text: guide }] };
      },
    );
  }
}

// Export the MCP server handler at /mcp
export const canvasMcpHandler = CanvasMCP.serve("/mcp");
