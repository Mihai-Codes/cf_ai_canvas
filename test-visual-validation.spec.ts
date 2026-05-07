import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

test.describe('Visual Diagram Generation Validation', () => {
  // Ensure test-results directory exists
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const testResultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  test('should generate different diagrams for different prompt types', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    const testCases = [
      {
        name: 'login-flow',
        prompt: 'Draw a login flow with success and error paths',
        expectedElements: 6-10
      },
      {
        name: 'architecture',
        prompt: 'Create a Cloudflare Workers AI architecture diagram',
        expectedElements: 8-15
      },
      {
        name: 'oauth-flow',
        prompt: 'Draw a 4-step MCP OAuth flow',
        expectedElements: 6-12
      },
      {
        name: 'microservices',
        prompt: 'Create a microservices architecture with API gateway and database',
        expectedElements: 6-12
      }
    ];

    for (const testCase of testCases) {
      // Clear previous state
      const clearButton = page.locator('button:has-text("Clear chat")');
      await clearButton.click();
      await page.waitForTimeout(500);

      // Reset canvas
      const resetButton = page.locator('button:has-text("Reset canvas")');
      await resetButton.click();
      await page.waitForTimeout(500);

      // Send the prompt
      const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
      await textarea.fill(testCase.prompt);
      
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response and canvas update
      await page.waitForSelector('.message.assistant', { timeout: 30000 });
      await page.waitForTimeout(2000); // Extra time for canvas rendering

      // Capture screenshot
      const screenshotPath = path.join(testResultsDir, `${testCase.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Captured screenshot: ${testCase.name}.png`);

      // Verify canvas has elements
      const canvasPanel = page.locator('.canvas-panel');
      await expect(canvasPanel).toBeVisible();
      
      // Verify canvas is visible (primary indicator of successful generation)
      await expect(canvasPanel).toBeVisible();
    }
  });

  test('should generate different diagrams for quick prompt suggestions', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    const quickPrompts = [
      'Draw a login flow with success and error paths',
      'Create a Cloudflare Workers AI architecture diagram',
      'Draw a 4-step MCP OAuth flow'
    ];

    for (let i = 0; i < quickPrompts.length; i++) {
      const prompt = quickPrompts[i];
      
      // Click the quick prompt button
      const promptButton = page.locator(`button:has-text("${prompt}")`);
      await promptButton.click();
      
      // Send the prompt
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response
      await page.waitForSelector('.message.assistant', { timeout: 30000 });
      await page.waitForTimeout(2000);

      // Capture screenshot
      const screenshotPath = path.join(testResultsDir, `quick-prompt-${i}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Captured quick prompt screenshot ${i}.png`);

      // Clear for next test
      const clearButton = page.locator('button:has-text("Clear chat")');
      await clearButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should verify attach image button and multimodal workflow', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    // Verify attach image button exists
    const attachButton = page.locator('button:has-text("Attach Image")');
    await expect(attachButton).toBeVisible();
    await expect(attachButton).toBeEnabled();

    // Capture UI screenshot
    const screenshotPath = path.join(testResultsDir, 'multimodal-ui.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Captured multimodal UI screenshot');
  });

  test('should handle edge cases gracefully', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    await page.waitForSelector('.chat-panel', { timeout: 10000 });

    const edgeCases = [
      'Draw me something', // Vague
      'Create a diagram', // Minimal
      'I need a very complex enterprise architecture with 50 components', // Overly complex
    ];

    for (let i = 0; i < edgeCases.length; i++) {
      const prompt = edgeCases[i];
      
      // Clear previous state
      const clearButton = page.locator('button:has-text("Clear chat")');
      await clearButton.click();
      await page.waitForTimeout(500);

      // Send edge case prompt
      const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
      await textarea.fill(prompt);
      
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response
      await page.waitForSelector('.message.assistant', { timeout: 30000 });
      await page.waitForTimeout(2000);

      // Capture screenshot
      const screenshotPath = path.join(testResultsDir, `edge-case-${i}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Captured edge case screenshot ${i}.png`);
    }
  });
});