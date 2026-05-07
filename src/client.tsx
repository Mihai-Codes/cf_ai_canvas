import "./styles.css";
import "tldraw/tldraw.css";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { toRichText } from "@tldraw/editor";
import { createShapeId, Tldraw, type Editor, type TLCreateShapePartial } from "tldraw";
import type { UIMessage } from "ai";
import type { CanvasElement, CanvasState, ElementColor, ElementType } from "./types";

type ChatAgentState = {
  canvas: CanvasState;
};

const TL_COLOR_MAP: Record<ElementColor, string> = {
  black: "black",
  grey: "grey",
  blue: "blue",
  "light-blue": "light-blue",
  violet: "violet",
  "light-violet": "light-violet",
  red: "red",
  "light-red": "light-red",
  orange: "orange",
  yellow: "yellow",
  green: "green",
  "light-green": "light-green",
  white: "white",
};

const GEO_MAP: Partial<Record<ElementType, string>> = {
  rectangle: "rectangle",
  ellipse: "ellipse",
  diamond: "diamond",
  triangle: "triangle",
  star: "star",
  cloud: "cloud",
  hexagon: "hexagon",
};

const TLDRAW_LICENSE_KEY = (import.meta as any).env?.VITE_TLDRAW_LICENSE_KEY as string | undefined;

const SVG_COLOR_MAP: Record<ElementColor, { stroke: string; fill: string }> = {
  black: { stroke: "#111827", fill: "#f8fafc" },
  grey: { stroke: "#64748b", fill: "#f1f5f9" },
  blue: { stroke: "#2563eb", fill: "#dbeafe" },
  "light-blue": { stroke: "#0284c7", fill: "#e0f2fe" },
  violet: { stroke: "#7c3aed", fill: "#ede9fe" },
  "light-violet": { stroke: "#8b5cf6", fill: "#f3e8ff" },
  red: { stroke: "#dc2626", fill: "#fee2e2" },
  "light-red": { stroke: "#ef4444", fill: "#fef2f2" },
  orange: { stroke: "#f97316", fill: "#ffedd5" },
  yellow: { stroke: "#ca8a04", fill: "#fef9c3" },
  green: { stroke: "#16a34a", fill: "#dcfce7" },
  "light-green": { stroke: "#22c55e", fill: "#f0fdf4" },
  white: { stroke: "#94a3b8", fill: "#ffffff" },
};

const RUNTIME_NOISE_PATTERNS = [
  /\b--no-sandbox\b/i,
  /DevTools listening on ws:\/\//i,
  /Failed to move to new namespace/i,
  /zygote host/i,
  /crbug\/1173575/i,
  /Opening in existing browser session/i,
];

function sanitizeMessageText(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !RUNTIME_NOISE_PATTERNS.some((pattern) => pattern.test(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toTldrawShape(element: CanvasElement): TLCreateShapePartial {
  const base = {
    id: createShapeId(element.id),
    x: element.x,
    y: element.y,
    rotation: 0,
    opacity: 1,
  };

  const color = TL_COLOR_MAP[element.color ?? "black"];
  const width = element.width ?? 120;
  const height = element.height ?? 80;
  const text = element.text ?? "";

  if (element.type === "text") {
    return {
      ...base,
      type: "text",
      props: {
        richText: toRichText(text),
        color,
        size: element.size ?? "m",
        font: element.font ?? "draw",
        w: width,
        textAlign: "middle",
        autoSize: false,
        scale: 1,
      },
    } as TLCreateShapePartial;
  }

  if (element.type === "note") {
    return {
      ...base,
      type: "note",
      props: {
        color,
        labelColor: color,
        size: element.size ?? "m",
        font: element.font ?? "draw",
        richText: toRichText(text),
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
        scale: 1,
        fontSizeAdjustment: null,
        textFirstEditedBy: null,
      },
    } as TLCreateShapePartial;
  }

  if (element.type === "frame") {
    return {
      ...base,
      type: "frame",
      props: {
        w: width,
        h: height,
        name: text || "Frame",
      },
    } as TLCreateShapePartial;
  }

  if (element.type === "line") {
    return {
      ...base,
      type: "geo",
      props: {
        geo: "rectangle",
        w: width,
        h: 2,
        color,
        fill: "none",
        dash: element.dash ?? "draw",
        size: element.size ?? "m",
        font: element.font ?? "draw",
        richText: toRichText(""),
        labelColor: color,
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
        scale: 1,
      },
    } as TLCreateShapePartial;
  }

  if (element.type === "arrow") {
    const props: any = {
        color,
        dash: element.dash ?? "draw",
        size: element.size ?? "m",
        fill: "none",
        font: element.font ?? "draw",
        richText: toRichText(text),
        labelColor: color,
        bend: 0,
        start: { x: 0, y: 0 },
        end: { x: width, y: height ?? 0 },
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
        labelPosition: 0.5,
        scale: 1,
        kind: "arc",
        elbowMidPoint: 0.5,
    };
    
    // @ts-ignore
    if (element.startBoundTo) {
      // @ts-ignore
      props.start = { type: "binding", boundShapeId: createShapeId(element.startBoundTo), normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false };
    }
    // @ts-ignore
    if (element.endBoundTo) {
      // @ts-ignore
      props.end = { type: "binding", boundShapeId: createShapeId(element.endBoundTo), normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false };
    }

    return {
      ...base,
      type: "arrow",
      props
    } as TLCreateShapePartial;
  }

  return {
    ...base,
    type: "geo",
    props: {
      geo: GEO_MAP[element.type] ?? "rectangle",
      w: width,
      h: height,
      color,
      fill: element.fill ?? "none",
      dash: element.dash ?? "draw",
      size: element.size ?? "m",
      font: element.font ?? "draw",
      richText: toRichText(text),
      labelColor: color,
      align: "middle",
      verticalAlign: "middle",
      growY: 0,
      url: "",
      scale: 1,
    },
  } as TLCreateShapePartial;
}

function SvgShape({ element }: { element: CanvasElement }) {
  const color = SVG_COLOR_MAP[element.color ?? "black"];
  const width = element.width ?? 120;
  const height = element.height ?? 80;
  const text = element.text ?? "";
  const strokeProps = {
    stroke: color.stroke,
    strokeWidth: 3,
    fill: element.fill === "solid" ? color.stroke : color.fill,
  };

  if (element.type === "arrow" || element.type === "line") {
    return (
      <g>
        <line
          x1={element.x}
          y1={element.y}
          x2={element.x + width}
          y2={element.y + height}
          stroke={color.stroke}
          strokeWidth={3}
          markerEnd={element.type === "arrow" ? "url(#arrowhead)" : undefined}
        />
        {text ? (
          <text
            x={element.x + width / 2}
            y={element.y + height / 2 - 8}
            textAnchor="middle"
            className="svg-label"
          >
            {text}
          </text>
        ) : null}
      </g>
    );
  }

  if (element.type === "ellipse" || element.type === "cloud") {
    return (
      <g>
        <ellipse
          cx={element.x + width / 2}
          cy={element.y + height / 2}
          rx={width / 2}
          ry={height / 2}
          {...strokeProps}
        />
        <SvgLabel x={element.x} y={element.y} width={width} height={height} text={text} />
      </g>
    );
  }

  if (element.type === "diamond") {
    const points = [
      [element.x + width / 2, element.y],
      [element.x + width, element.y + height / 2],
      [element.x + width / 2, element.y + height],
      [element.x, element.y + height / 2],
    ].map((point) => point.join(",")).join(" ");
    return (
      <g>
        <polygon points={points} {...strokeProps} />
        <SvgLabel x={element.x} y={element.y} width={width} height={height} text={text} />
      </g>
    );
  }

  if (element.type === "triangle") {
    const points = [
      [element.x + width / 2, element.y],
      [element.x + width, element.y + height],
      [element.x, element.y + height],
    ].map((point) => point.join(",")).join(" ");
    return (
      <g>
        <polygon points={points} {...strokeProps} />
        <SvgLabel x={element.x} y={element.y + height * 0.16} width={width} height={height} text={text} />
      </g>
    );
  }

  if (element.type === "hexagon") {
    const points = [
      [element.x + width * 0.22, element.y],
      [element.x + width * 0.78, element.y],
      [element.x + width, element.y + height / 2],
      [element.x + width * 0.78, element.y + height],
      [element.x + width * 0.22, element.y + height],
      [element.x, element.y + height / 2],
    ].map((point) => point.join(",")).join(" ");
    return (
      <g>
        <polygon points={points} {...strokeProps} />
        <SvgLabel x={element.x} y={element.y} width={width} height={height} text={text} />
      </g>
    );
  }

  if (element.type === "text") {
    return (
      <text x={element.x} y={element.y + 24} className="svg-label svg-label-standalone">
        {text}
      </text>
    );
  }

  return (
    <g>
      <rect x={element.x} y={element.y} width={width} height={height} rx={8} {...strokeProps} />
      <SvgLabel x={element.x} y={element.y} width={width} height={height} text={text} />
    </g>
  );
}

function SvgLabel({
  x,
  y,
  width,
  height,
  text,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}) {
  if (!text) return null;
  const words = text.split(/\s+/);
  const lines = words.reduce<string[]>((acc, word) => {
    const current = acc[acc.length - 1] ?? "";
    const next = current ? `${current} ${word}` : word;
    if (next.length > 20 && current) acc.push(word);
    else acc[acc.length - 1] = next;
    return acc;
  }, [""]).slice(0, 3);

  const startY = y + height / 2 - ((lines.length - 1) * 18) / 2;
  return (
    <text x={x + width / 2} y={startY} textAnchor="middle" dominantBaseline="middle" className="svg-label">
      {lines.map((line, index) => (
        <tspan key={line + index} x={x + width / 2} dy={index === 0 ? 0 : 18}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function FallbackCanvas({ canvas }: { canvas?: CanvasState }) {
  const elements = Object.values(canvas?.elements ?? {});
  if (elements.length === 0) {
    return (
      <div className="fallback-empty" role="status" aria-live="polite">
        <p>No canvas elements yet.</p>
      </div>
    );
  }

  const bounds = elements.reduce(
    (acc, element) => {
      const width = element.width ?? 120;
      const height = element.height ?? 80;
      return {
        minX: Math.min(acc.minX, element.x),
        minY: Math.min(acc.minY, element.y),
        maxX: Math.max(acc.maxX, element.x + width),
        maxY: Math.max(acc.maxY, element.y + height),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

  const padding = 120;
  const viewBox = [
    bounds.minX - padding,
    bounds.minY - padding,
    bounds.maxX - bounds.minX + padding * 2,
    bounds.maxY - bounds.minY + padding * 2,
  ].join(" ");

  const svgWidth = bounds.maxX - bounds.minX + padding * 2;
  const svgHeight = bounds.maxY - bounds.minY + padding * 2;
  
  return (
    <div className="fallback-canvas" aria-label="Read-only generated canvas" role="region" aria-labelledby="canvas-heading" style={{ width: '100%', overflow: 'auto' }}>
      <h2 id="canvas-heading" className="sr-only">Generated Diagram</h2>
      <svg viewBox={viewBox} role="img" aria-label="Generated diagram" focusable="false" style={{ width: `${svgWidth}px`, height: `${svgHeight}px`, minWidth: '100%', minHeight: '100%' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>
        {elements.map((element) => (
          <SvgShape key={element.id} element={element} />
        ))}
      </svg>
      <div className="fallback-note">
        Read-only renderer. Add `VITE_TLDRAW_LICENSE_KEY` to enable the production tldraw editor.
      </div>
    </div>
  );
}

function CanvasView({ canvas }: { canvas?: CanvasState }) {
  const editorRef = useRef<Editor | null>(null);
  const lastHashRef = useRef("");
  const [isRendering, setIsRendering] = useState(false);

  const shapes = useMemo(() => {
    return Object.values(canvas?.elements ?? {}).map(toTldrawShape);
  }, [canvas?.elements]);

  const batchProcessShapes = useCallback((shapes: TLCreateShapePartial[], batchSize = 20) => {
    const batches: TLCreateShapePartial[][] = [];
    for (let i = 0; i < shapes.length; i += batchSize) {
      batches.push(shapes.slice(i, i + batchSize));
    }
    return batches;
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isRendering) return;

    const nextHash = JSON.stringify(shapes);
    if (nextHash === lastHashRef.current) return;
    lastHashRef.current = nextHash;

    if (shapes.length > 50) {
      setIsRendering(true);
      const batches = batchProcessShapes(shapes);
      
      editor.run(
        () => {
          editor.updateInstanceState({ isReadonly: false });
          const currentIds = editor
            .getCurrentPageShapes()
            .filter((shape) => shape.id.startsWith("shape:"))
            .map((shape) => shape.id);

          if (currentIds.length > 0) editor.deleteShapes(currentIds);
          
          batches.forEach((batch: TLCreateShapePartial[]) => {
            if (batch.length > 0) {
              editor.createShapes(batch);
            }
          });
          
          editor.zoomToFit({ animation: { duration: 250 } });
          editor.updateInstanceState({ isReadonly: true });
          setIsRendering(false);
        },
        { history: "ignore" },
      );
    } else {
      editor.run(
        () => {
          editor.updateInstanceState({ isReadonly: false });
          const currentIds = editor
            .getCurrentPageShapes()
            .filter((shape) => shape.id.startsWith("shape:"))
            .map((shape) => shape.id);

          if (currentIds.length > 0) editor.deleteShapes(currentIds);
          if (shapes.length > 0) {
            editor.createShapes(shapes);
            editor.zoomToFit({ animation: { duration: 250 } });
          }
          editor.updateInstanceState({ isReadonly: true });
        },
        { history: "ignore" },
      );
    }
  }, [shapes, batchProcessShapes, isRendering]);

  return (
    <div className="canvas-shell" style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      {TLDRAW_LICENSE_KEY ? (
        <Tldraw
          licenseKey={TLDRAW_LICENSE_KEY}
          onMount={(editor) => {
            editorRef.current = editor;
            if (shapes.length > 0) {
              editor.createShapes(shapes);
              editor.zoomToFit();
            }
            editor.updateInstanceState({ isReadonly: false });
          }}
        />
      ) : (
        <FallbackCanvas canvas={canvas} />
      )}
    </div>
  );
}

function MessagePart({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          const sanitized = sanitizeMessageText(part.text);
          if (!sanitized) return null;
          return <span key={index}>{sanitized}</span>;
        }

        if (part.type.startsWith("tool-")) {
          return (
            <details key={index} className="tool-part">
              <summary>{part.type.replace("tool-", "tool: ")}</summary>
              <pre>{JSON.stringify(part, null, 2)}</pre>
            </details>
          );
        }

        return null;
      })}
    </>
  );
}

function ChatPanel({
  agent,
  connected,
}: {
  agent: ReturnType<typeof useAgent<ChatAgentState>>;
  connected: boolean;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, clearHistory, status, stop } = useAgentChat({
    agent,
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    
    // Send message to LLM first to lock in the input state
    await sendMessage({ text });

    // Then clear canvas to avoid race conditions with LLM receiving old state
    if (agent.state) {
      agent.setState({
        ...agent.state,
        canvas: { ...agent.state.canvas, elements: {} },
      });
    }
  }

  function resetCanvas() {
    const current = agent.state ?? {
      canvas: { elements: {}, viewportZoom: 1, viewportX: 0, viewportY: 0 },
    };

    agent.setState({
      ...current,
      canvas: { ...current.canvas, elements: {} },
    });
  }

  return (
    <aside className="chat-panel">
      <div className="panel-header">
        <div>
          <h1>cf_ai_canvas</h1>
          <p>Default session</p>
        </div>
        <span className={connected ? "status connected" : "status"}>
          {connected ? "connected" : "offline"}
        </span>
      </div>

      <div className="quick-prompts">
        {[
          "Draw a login flow with success and error paths",
          "Create a Cloudflare Workers AI architecture diagram",
          "Draw a 4-step MCP OAuth flow",
        ].map((prompt) => (
          <button key={prompt} type="button" onClick={() => setInput(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="messages">
        {messages.length === 0 ? (
          <div className="empty-message">
            No messages yet.
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <strong>{message.role}</strong>
              <div>
                <MessagePart message={message} />
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Draw a microservices diagram..."
          disabled={!connected || isBusy}
        />
        <div className="composer-actions">
          <button type="button" onClick={clearHistory}>
            Clear chat
          </button>
          <button type="button" onClick={resetCanvas}>
            Reset canvas
          </button>
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const imageData = e.target?.result;
                  if (typeof imageData === 'string') {
                    sendMessage({ text: input, parts: [{ type: 'image', data: imageData }] as any });
                    setInput('');
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
            disabled={!connected || isBusy}
          />
          <button type="button"
            onClick={() => document.getElementById('image-upload')?.click()}
            disabled={!connected || isBusy}
            title="Attach image for multimodal analysis"
          >
             Attach Image
          </button>
          {isBusy ? (
            <button type="button" onClick={stop}>
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!connected || !input.trim()}>
              Send
            </button>
          )}
        </div>
      </form>
    </aside>
  );
}

function App() {
  const [connected, setConnected] = useState(false);

  const agent = useAgent<ChatAgentState>({
    agent: "ChatAgent",
    name: "default",
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
    onError: (event) => console.error("Agent WebSocket error", event),
  });

  const canvas = agent.state?.canvas;

  return (
    <main className="app">
      <ChatPanel agent={agent} connected={connected} />
      <section className="canvas-panel">
        <div className="canvas-header">
          <div>
            <h2>Live Canvas</h2>
            <p>{Object.keys(canvas?.elements ?? {}).length} elements</p>
          </div>
          <code>/mcp</code>
        </div>
        <CanvasView canvas={canvas} />
      </section>
    </main>
  );
}

i18n
  .use(initReactI18next)
  .init({
    lng: navigator.language.split('-')[0] || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: require('../public/locales/en/translation.json'),
      },
      ro: {
        translation: require('../public/locales/ro/translation.json'),
      },
    },
  });

createRoot(document.getElementById("root")!).render(<App />);
