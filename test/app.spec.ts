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

  test('should generate diagram from quick prompt', async ({ page }) => {
    const quickPrompt = page.locator('button:has-text("Draw a login flow")');
    await quickPrompt.click();
    
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    await page.waitForTimeout(5000);
    
    await expect(page.locator('.canvas-panel')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/login-flow-diagram.png', fullPage: true });
  });

  test('should generate architecture diagram', async ({ page }) => {
    const quickPrompt = page.locator('button:has-text("Create a Cloudflare")');
    await quickPrompt.click();
    
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    await page.waitForTimeout(5000);
    
    await expect(page.locator('.canvas-panel')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/architecture-diagram.png', fullPage: true });
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    
    await expect(page.locator('.app')).toBeVisible();
    await expect(page.locator('.chat-panel')).toBeVisible();
    await expect(page.locator('.canvas-panel')).toBeVisible();
    
    const chatPanel = page.locator('.chat-panel');
    const canvasPanel = page.locator('.canvas-panel');
    
    const chatWidth = await chatPanel.evaluate(node => node.getBoundingClientRect().width);
    const canvasWidth = await canvasPanel.evaluate(node => node.getBoundingClientRect().width);
    
    expect(chatWidth).toBeGreaterThan(300);
    expect(canvasWidth).toBeGreaterThan(300);
    
    await page.screenshot({ path: 'test-results/mobile-responsive.png', fullPage: true });
  });

  test('should handle large diagrams efficiently', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
    await textarea.fill('Create a complex system with 20 components including databases, APIs, frontend services, authentication, caching, message queues, monitoring, logging, CDN, load balancers, and multiple microservices');
    
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    await page.waitForTimeout(10000);
    
    await expect(page.locator('.canvas-panel')).toBeVisible();
    
    const canvasPanel = page.locator('.canvas-panel');
    const canvasWidth = await canvasPanel.evaluate(node => node.scrollWidth);
    const canvasHeight = await canvasPanel.evaluate(node => node.scrollHeight);
    
    expect(canvasWidth).toBeGreaterThan(800);
    expect(canvasHeight).toBeGreaterThan(600);
    
    await page.screenshot({ path: 'test-results/large-diagram.png', fullPage: true });
  });

  test('should verify canvas expands for complex diagrams', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
    await textarea.fill('Draw a detailed Cloudflare Workers architecture with React frontend, Worker router, ChatAgent DO, CanvasMCP DO, Workers AI integration, KV storage, and all connections clearly labeled');
    
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    await page.waitForTimeout(8000);
    
    // Switch to desktop viewport size again to restore state
    await page.setViewportSize({ width: 1280, height: 800 });
    
    const canvasPanel = page.locator('.canvas-panel');
    await expect(canvasPanel).toBeVisible();
    
    const canvasBounds = await canvasPanel.boundingBox();
    expect(canvasBounds?.width).toBeGreaterThan(600);
    expect(canvasBounds?.height).toBeGreaterThan(400);
    
    await page.screenshot({ path: 'test-results/complex-architecture.png', fullPage: true });
  });

  test('should show image attachment button', async ({ page }) => {
    const attachButton = page.locator('button[title="Attach image for multimodal analysis"]');
    await expect(attachButton).toBeVisible();
    await expect(attachButton).toHaveText('Attach Image');
  });

  test('should have hidden file input for image upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][id="image-upload"]');
    await expect(fileInput).toBeAttached();
    expect(await fileInput.getAttribute('accept')).toBe('image/*');
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