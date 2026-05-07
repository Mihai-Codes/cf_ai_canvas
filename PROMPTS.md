# AI Prompts Engineering Documentation

This document records the technical prompts and engineering decisions used to develop `cf_ai_canvas` for the Cloudflare Software Engineering Internship (Summer 2026).

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Diagram Generation Algorithm](#diagram-generation-algorithm)
3. [MCP Protocol Integration](#mcp-protocol-integration)
4. [Error Handling Strategy](#error-handling-strategy)
5. [Performance Optimization](#performance-optimization)

## System Architecture

### Cloudflare Workers Integration

**Prompt**: "Design a Cloudflare Workers architecture that integrates Workers AI (Llama 3.3), Durable Objects for state management, and KV for persistent storage, with a React frontend served via static assets."

**Engineering Decision**:
- Worker entry point routes requests to agents
- ChatAgent Durable Object handles NL→diagram conversion
- CanvasMCP Durable Object provides 17 canvas tools via MCP
- SQLite storage for Durable Object state persistence
- KV namespace for named canvas snapshots

**Implementation**: `src/server.ts`, `src/chat-agent.ts`, `src/canvas-mcp.ts`

### State Management Strategy

**Prompt**: "Implement state synchronization between React frontend and Durable Object backend with WebSocket fallback for real-time updates."

**Engineering Decision**:
- Use Cloudflare's `useAgent` for WebSocket state sync
- Fallback to polling if WebSocket unavailable
- Persist canvas state in DO SQLite storage
- Sync state on every user interaction

**Implementation**: `src/client.tsx`, Durable Object state management

## Diagram Generation Algorithm

### Layout Optimization

**Prompt**: "Create an algorithm that prevents element overlap in generated diagrams while maintaining logical flow connections."

**Engineering Decision**:
- Grid-based layout system (120px spacing)
- Collision detection with fallback positioning
- Minimum 40px spacing between all elements
- Left-to-right, top-to-bottom placement
- Arrow routing with proper connection points

**Implementation**: `fixLayoutOverlaps()` method in `src/chat-agent.ts`

### Intent Detection

**Prompt**: "Implement intent classification to generate appropriate diagram templates based on user prompts."

**Engineering Decision**:
- Keyword-based scoring system
- Three intent categories: architecture, oauth_flow, login_flow
- Fallback to generic template if confidence low
- Minimum score threshold for intent matching

**Implementation**: `detectIntent()` method with scoring algorithm

### AI Prompt Engineering

**Prompt**: "Design AI prompts that generate structured diagram plans with proper layout constraints."

**Engineering Decision**:
- Structured JSON output format
- Explicit layout rules (grid, spacing, no overlap)
- Intent-specific element requirements
- Minimum element counts per diagram type
- Clear labeling constraints

**Implementation**: Workers AI prompt in `generatePlanWithModel()`

## MCP Protocol Integration

### Streamable HTTP Transport

**Prompt**: "Implement MCP protocol using Cloudflare's Streamable HTTP transport with proper error handling."

**Engineering Decision**:
- Use `McpAgent.serve()` for protocol handling
- Require proper headers (Accept: text/event-stream)
- Session-based routing with Durable Objects
- JSON-RPC 2.0 error format compliance
- CORS support for cross-origin clients

**Implementation**: `CanvasMCP.serve()` in `src/canvas-mcp.ts`

### Tool Registration Pattern

**Prompt**: "Register 17 canvas tools following MCP protocol specifications with proper input validation."

**Engineering Decision**:
- Zod schema validation for all tool inputs
- Async tool execution with error handling
- State persistence after each operation
- Input sanitization and normalization
- Consistent error response format

**Implementation**: Tool registration in `init()` method

## Error Handling Strategy

### AI Fallback Mechanism

**Prompt**: "Design fallback behavior when Workers AI fails to generate valid diagram plans."

**Engineering Decision**:
- Parse AI output with validation
- Fallback to intent-specific templates
- Generic template as last resort
- Error logging without user exposure
- Graceful degradation path

**Implementation**: `parsePlan()` with fallback chain

### Input Validation

**Prompt**: "Implement robust input validation for MCP tool parameters."

**Engineering Decision**:
- Zod schemas for all tool inputs
- Type-safe parameter parsing
- Range validation for coordinates
- String sanitization for labels
- Required field enforcement

**Implementation**: Zod schemas in `src/canvas-mcp.ts`

## Performance Optimization

### Diagram Rendering

**Prompt**: "Optimize diagram rendering for large canvases with many elements."

**Engineering Decision**:
- Virtualized rendering in tldraw
- SVG fallback for read-only mode
- Batching for element creation
- Debounced state updates
- Efficient DOM updates

**Implementation**: `CanvasView` component with optimization

### State Synchronization

**Prompt**: "Minimize state synchronization overhead between client and server."

**Engineering Decision**:
- Delta updates instead of full state
- Throttled WebSocket messages
- Client-side caching
- Optimistic UI updates
- Conflict resolution strategy

**Implementation**: Agent state management

## Testing Strategy

### End-to-End Testing

**Prompt**: "Design comprehensive testing strategy for browser-based diagram application."

**Engineering Decision**:
- Playwright for browser interaction
- Visual regression testing
- Screenshot comparison
- Performance benchmarks
- Accessibility validation

**Implementation**: `test/app.spec.ts` with Playwright

### MCP Protocol Testing

**Prompt**: "Verify MCP endpoint compliance with protocol specifications."

**Engineering Decision**:
- Header validation tests
- Error format compliance
- Session management
- Tool execution verification
- Response time measurement

**Implementation**: MCP endpoint tests

## Deployment Strategy

### CI/CD Pipeline

**Prompt**: "Design deployment pipeline with quality gates for Cloudflare Workers."

**Engineering Decision**:
- TypeScript compilation check
- Production build validation
- Guarded deployment to main
- Rollback capability
- Monitoring integration

**Implementation**: GitHub Actions workflow

### Environment Configuration

**Prompt**: "Manage environment-specific configuration for development and production."

**Engineering Decision**:
- Wrangler configuration
- Secret management
- Feature flags
- Environment detection
- Configuration validation

**Implementation**: `wrangler.jsonc` with environment setup

## Technical Debt Management

### Known Issues

1. **Diagram Layout**: AI-generated layouts may require manual adjustment
2. **Mobile Responsiveness**: Limited testing on mobile devices
3. **Performance**: Large diagrams may impact rendering
4. **Accessibility**: Screen reader support needs improvement
5. **Internationalization**: Hardcoded English labels

### Future Improvements

1. **Layout Algorithm**: Implement force-directed graph layout
2. **Collaboration**: Real-time multi-user editing
3. **Templates**: Expand library of diagram templates
4. **Export**: Additional format support (PNG, SVG, PDF)
5. **Authentication**: OAuth integration for MCP endpoint

## Conclusion

This document serves as a technical reference for the engineering decisions made during the development of `cf_ai_canvas`. Each prompt represents a specific technical challenge that was addressed with a documented solution.

**Last Updated**: May 7, 2026
**Status**: Production-ready with documented technical debt