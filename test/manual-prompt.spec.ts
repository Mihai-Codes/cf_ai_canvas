import { test, expect } from '@playwright/test';

test.describe('Manual Prompt Diagram Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
  });

  test('should generate diagram from typed prompt', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
    await textarea.fill('Draw a simple flowchart with start, decision, and end nodes');
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    await page.waitForTimeout(8000);
    
    await expect(page.locator('.canvas-panel')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/manual-prompt-diagram.png', fullPage: true });
  });
});
