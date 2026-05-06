import { test, expect } from '@playwright/test';

test.describe('cf_ai_canvas Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/cf_ai_canvas/);
    await expect(page.locator('text=cf_ai_canvas')).toBeVisible();
  });

  test('should show chat interface', async ({ page }) => {
    const chatPanel = page.locator('.chat-panel');
    await expect(chatPanel).toBeVisible();
    await expect(page.locator('textarea[placeholder="Draw a microservices diagram..."]')).toBeVisible();
  });

  test('should show canvas panel', async ({ page }) => {
    const canvasPanel = page.locator('.canvas-panel');
    await expect(canvasPanel).toBeVisible();
    await expect(page.locator('text=Live Canvas')).toBeVisible();
  });

  test('should show quick prompts', async ({ page }) => {
    const quickPrompts = page.locator('.quick-prompts');
    await expect(quickPrompts).toBeVisible();
    await expect(page.locator('button:has-text("Draw a login flow")')).toBeVisible();
    await expect(page.locator('button:has-text("Create a Cloudflare")')).toBeVisible();
  });

  test('should not show sandbox warnings', async ({ page }) => {
    const pageContent = await page.content();
    expect(pageContent).not.toContain('--no-sandbox');
    expect(pageContent).not.toContain('no-sandbox');
  });

  test('should show MCP endpoint reference', async ({ page }) => {
    await expect(page.locator('text=/mcp')).toBeVisible();
  });

  test('should allow prompt input', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
    await textarea.fill('Draw a simple flowchart');
    await expect(textarea).toHaveValue('Draw a simple flowchart');
  });

  test('should show send button when input is provided', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
    await textarea.fill('Test prompt');
    await expect(page.locator('button:has-text("Send")')).toBeEnabled();
  });
});

test.describe('MCP Endpoint Tests', () => {
  test('should respond to MCP endpoint', async ({ request }) => {
    const response = await request.get('https://cf-ai-canvas.mc146.workers.dev/mcp');
    expect(response.ok()).toBeFalsy();
    const data = await response.json();
    expect(data.jsonrpc).toBe('2.0');
    expect(data.error.message).toContain('text/event-stream');
  });

  test('should require proper headers', async ({ request }) => {
    const response = await request.get('https://cf-ai-canvas.mc146.workers.dev/mcp', {
      headers: {
        'Accept': 'text/event-stream'
      }
    });
    expect(response.ok()).toBeFalsy();
    const data = await response.json();
    expect(data.error.message).toContain('Mcp-Session-Id');
  });
});