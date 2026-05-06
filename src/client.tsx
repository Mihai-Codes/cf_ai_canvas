import "./styles.css";
import "tldraw/tldraw.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
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
        text,
        color,
        size: element.size ?? "m",
        font: element.font ?? "draw",
        w: width,
      },
    } as TLCreateShapePartial;
  }

  if (element.type === "note") {
    return {
      ...base,
      type: "note",
      props: {
        color,
        size: element.size ?? "m",
        font: element.font ?? "draw",
        text,
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
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
        text,
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
      },
    } as TLCreateShapePartial;
  }

  if (element.type === "arrow") {
    return {
      ...base,
      type: "arrow",
      props: {
        color,
        dash: element.dash ?? "draw",
        size: element.size ?? "m",
        fill: "none",
        font: element.font ?? "draw",
        text,
        labelColor: color,
        bend: 0,
        start: { x: 0, y: 0 },
        end: { x: width, y: height ?? 0 },
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
      },
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
      text,
      align: "middle",
      verticalAlign: "middle",
      growY: 0,
      url: "",
    },
  } as TLCreateShapePartial;
}

function CanvasView({ canvas }: { canvas?: CanvasState }) {
  const editorRef = useRef<Editor | null>(null);
  const lastHashRef = useRef("");

  const shapes = useMemo(() => {
    return Object.values(canvas?.elements ?? {}).map(toTldrawShape);
  }, [canvas?.elements]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextHash = JSON.stringify(shapes);
    if (nextHash === lastHashRef.current) return;
    lastHashRef.current = nextHash;

    editor.run(
      () => {
        const currentIds = editor
          .getCurrentPageShapes()
          .filter((shape) => shape.id.startsWith("shape:"))
          .map((shape) => shape.id);

        if (currentIds.length > 0) editor.deleteShapes(currentIds);
        if (shapes.length > 0) {
          editor.createShapes(shapes);
          editor.zoomToFit({ animation: { duration: 250 } });
        }
      },
      { history: "ignore" },
    );
  }, [shapes]);

  return (
    <div className="canvas-shell">
      <Tldraw
        onMount={(editor) => {
          editorRef.current = editor;
          editor.updateInstanceState({ isReadonly: true });
          if (shapes.length > 0) {
            editor.createShapes(shapes);
            editor.zoomToFit();
          }
        }}
      />
    </div>
  );
}

function MessagePart({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.text}</span>;
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

  function send() {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    sendMessage({ text });
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

createRoot(document.getElementById("root")!).render(<App />);
