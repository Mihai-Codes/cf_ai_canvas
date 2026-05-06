import { describe, it, expect } from 'vitest';

describe('MCP Endpoint Tests', () => {
  const MCP_ENDPOINT = 'https://cf-ai-canvas.mc146.workers.dev/mcp';

  it('should respond to MCP endpoint', async () => {
    const response = await fetch(MCP_ENDPOINT);
    const data = await response.json();
    
    expect(response.ok).toBe(false); // Should fail without proper headers
    expect(data.jsonrpc).toBe('2.0');
    expect(data.error).toBeDefined();
    expect(data.error.message).toContain('text/event-stream');
  }, { timeout: 10000 });

  it('should require Accept header', async () => {
    const response = await fetch(MCP_ENDPOINT, {
      headers: { 'Accept': 'text/event-stream' }
    });
    const data = await response.json();
    
    expect(response.ok).toBe(false); // Should fail without session ID
    expect(data.jsonrpc).toBe('2.0');
    expect(data.error).toBeDefined();
    expect(data.error.message).toContain('Mcp-Session-Id');
  }, { timeout: 10000 });

  it('should require session ID', async () => {
    const response = await fetch(MCP_ENDPOINT, {
      headers: {
        'Accept': 'text/event-stream',
        'Mcp-Session-Id': 'test-session'
      }
    });
    const data = await response.json();
    
    expect(response.ok).toBe(false); // Should fail with session not found
    expect(data.jsonrpc).toBe('2.0');
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe(-32001);
    expect(data.error.message).toContain('Session not found');
  }, { timeout: 10000 });

  it('should return proper JSON-RPC error format', async () => {
    const response = await fetch(MCP_ENDPOINT);
    const data = await response.json();
    
    expect(data).toHaveProperty('jsonrpc', '2.0');
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code');
    expect(data.error).toHaveProperty('message');
    expect(data).toHaveProperty('id', null);
  }, { timeout: 10000 });
});