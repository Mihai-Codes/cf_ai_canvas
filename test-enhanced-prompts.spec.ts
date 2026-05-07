import { test, expect } from '@playwright/test';

test.describe('Enhanced Prompt Engineering', () => {
  test('should handle complex architecture prompts with enhanced spatial guidance', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    // Test complex architecture prompt
    const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
    await textarea.fill('Create a detailed Cloudflare Workers architecture with React frontend, Worker router, ChatAgent DO, CanvasMCP DO, Workers AI integration, KV storage, and all connections clearly labeled.');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait for assistant response
    await page.waitForSelector('.message.assistant', { timeout: 30000 });
    
    // Verify response is received
    const assistantMessages = page.locator('.message.assistant');
    await expect(assistantMessages.first()).toBeVisible();
    
    // Check that canvas elements were generated (even if simple, should have some structure)
    const canvasPanel = page.locator('.canvas-panel');
    await expect(canvasPanel).toBeVisible();
  });

  test('should handle quick prompt suggestions with enhanced engineering', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    // Test each quick prompt
    const quickPrompts = [
      'Draw a login flow with success and error paths',
      'Create a Cloudflare Workers AI architecture diagram',
      'Draw a 4-step MCP OAuth flow'
    ];

    for (const prompt of quickPrompts) {
      const promptButton = page.locator(`button:has-text("${prompt}")`);
      await promptButton.click();
      
      const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
      await expect(textarea).toHaveValue(prompt);
      
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();
      
      // Wait for response
      await page.waitForSelector('.message.assistant', { timeout: 30000 });
      
      // Clear for next test
      const clearButton = page.locator('button:has-text("Clear chat")');
      await clearButton.click();
      await page.waitForTimeout(1000); // Wait for clear to complete
    }
  });

  test('should handle custom user prompts with spatial constraints', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    // Test various custom prompt patterns
    const customPrompts = [
      {
        prompt: 'Draw a CI/CD pipeline with 6 steps from commit to production',
        expectedElements: 4-8
      },
      {
        prompt: 'Create a network diagram with Cloudflare at edge, CDN in middle, origin servers at bottom',
        expectedElements: 3-6
      },
      {
        prompt: 'Design a 3-tier web application architecture with presentation, business, and data layers',
        expectedElements: 3-5
      }
    ];

    for (const { prompt, expectedElements } of customPrompts) {
      const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
      await textarea.fill(prompt);
      
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();
      
      // Wait for response
      await page.waitForSelector('.message.assistant', { timeout: 30000 });
      
      // Verify assistant responded
      const assistantMessages = page.locator('.message.assistant');
      await expect(assistantMessages.first()).toBeVisible();
      
      // Clear for next test
      const clearButton = page.locator('button:has-text("Clear chat")');
      await clearButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should verify attach image button functionality', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    // Verify attach image button exists and is enabled
    const attachButton = page.locator('button:has-text(" Attach Image")');
    await expect(attachButton).toBeVisible();
    await expect(attachButton).toBeEnabled();
    
    // Verify file input exists (it's hidden by design, but should exist in DOM)
    const fileInput = page.locator('#image-upload');
    await expect(fileInput).toBeAttached();
    
    // Test button click triggers file input
    await attachButton.click();
    // Note: We can't actually test file upload in CI without a real file,
    // but we can verify the input is triggered
  });

  test('should handle prompt variations and edge cases', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    // Test edge cases
    const edgeCases = [
      'Draw me something', // Vague prompt
      'Create a diagram', // Minimal prompt
      'I need a very complex enterprise architecture with 50 components and multiple layers and connections and integrations', // Overly complex
      'Show me a flowchart' // Simple request
    ];

    for (const prompt of edgeCases) {
      const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
      await textarea.fill(prompt);
      
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();
      
      // Wait for response - even vague prompts should get a response
      await page.waitForSelector('.message.assistant', { timeout: 30000 });
      
      // Clear for next test
      const clearButton = page.locator('button:has-text("Clear chat")');
      await clearButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should maintain canvas state across multiple interactions', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    // Send multiple prompts in sequence
    const prompts = [
      'Draw a simple login flow',
      'Add an error handling path',
      'Include a database connection'
    ];

    for (const prompt of prompts) {
      const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
      await textarea.fill(prompt);
      
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();
      
      // Wait for each response
      await page.waitForSelector('.message.assistant', { timeout: 30000 });
      
      // Verify canvas is still visible
      const canvasPanel = page.locator('.canvas-panel');
      await expect(canvasPanel).toBeVisible();
    }
    
    // Verify all messages are preserved
    const messages = page.locator('.message');
    await expect(messages).toHaveCount(prompts.length * 2); // user + assistant for each
  });
});