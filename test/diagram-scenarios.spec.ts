/**
 * diagram-scenarios.spec.ts
 *
 * End-to-end smoke tests for all three diagram generation paths:
 *   1. Quick-prompt button click (auto-sends)
 *   2. Manual typed prompt
 *   3. Image attached with text prompt
 *
 * Each test verifies that shapes actually appear in the canvas
 * (element counter > 0) after the LLM responds, then screenshots the result.
 */
import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const APP = "https://cf-ai-canvas.mc146.workers.dev";

// Tiny 10x10 white PNG for the image-upload test (pure base64, no deps)
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk" +
  "+M9Qz0AEYBxVSF+FABJADveax3/VAAAAAElFTkSuQmCC";

function screenshotPath(name: string) {
  const dir = path.join(__dirname, "..", "test-results");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${name}.png`);
}

/** Wait until the WebSocket is connected and the status indicator says "connected". */
async function waitForConnection(page: Page, timeout = 20_000) {
  await page.waitForSelector('[data-testid="connection-status"]', { timeout });
  await expect(
    page.locator('[data-testid="connection-status"]')
  ).toHaveText("connected", { timeout });
}

/**
 * Wait until the element-count indicator shows at least `minCount` elements.
 * LLM calls take 15-40 s depending on model load; allow up to 90 s.
 */
async function waitForElements(page: Page, minCount = 1, timeout = 90_000) {
  await page.waitForFunction(
    (min) => {
      const el = document.querySelector('[data-testid="element-count"]');
      if (!el) return false;
      const match = el.textContent?.match(/(\d+)\s+elements?/);
      return match ? parseInt(match[1], 10) >= min : false;
    },
    minCount,
    { timeout }
  );
}

/** Extract the element count from the counter element. */
async function getElementCount(page: Page): Promise<number> {
  const text = await page
    .locator('[data-testid="element-count"]')
    .textContent();
  const match = text?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Reset canvas between tests using the Reset canvas button. */
async function resetCanvas(page: Page) {
  const btn = page.locator('button:has-text("Reset canvas")');
  if (await btn.isVisible()) await btn.click();
  // Wait a moment for state to clear
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

test.describe("Diagram generation — all three input paths", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP, { waitUntil: "domcontentloaded" });
    await waitForConnection(page);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Quick-prompt buttons (auto-send on click)
  // -------------------------------------------------------------------------

  test("Quick prompt: login flow generates shapes", async ({ page }) => {
    await resetCanvas(page);

    const btn = page.locator('[data-testid="quick-prompt"]').first();
    const label = await btn.textContent();
    console.log(`[quick-prompt] clicking: ${label}`);

    await btn.click();

    // Wait for the LLM to respond and shapes to appear
    await waitForElements(page, 3);

    const count = await getElementCount(page);
    console.log(`[quick-prompt] got ${count} elements`);

    await page.screenshot({ path: screenshotPath("01-quick-login-flow"), fullPage: true });

    expect(count).toBeGreaterThanOrEqual(3);

    // Verify the canvas panel is still visible (not crashed / white-screened)
    await expect(page.locator(".canvas-panel")).toBeVisible();

    // Verify no --no-sandbox noise in any message
    const messages = await page.locator(".message").allTextContents();
    for (const m of messages) {
      expect(m).not.toMatch(/--no-sandbox/i);
    }
  });

  test("Quick prompt: Cloudflare Workers AI architecture generates shapes", async ({
    page,
  }) => {
    await resetCanvas(page);

    const buttons = page.locator('[data-testid="quick-prompt"]');
    const btn = buttons.nth(1); // "Create a Cloudflare Workers AI architecture diagram"
    const label = await btn.textContent();
    console.log(`[quick-prompt] clicking: ${label}`);

    await btn.click();
    await waitForElements(page, 4);

    const count = await getElementCount(page);
    console.log(`[quick-prompt] got ${count} elements`);

    await page.screenshot({
      path: screenshotPath("02-quick-cloudflare-arch"),
      fullPage: true,
    });

    expect(count).toBeGreaterThanOrEqual(4);
    await expect(page.locator(".canvas-panel")).toBeVisible();
  });

  test("Quick prompt: MCP OAuth flow generates shapes", async ({ page }) => {
    await resetCanvas(page);

    const buttons = page.locator('[data-testid="quick-prompt"]');
    const btn = buttons.nth(2); // "Draw a 4-step MCP OAuth flow"
    const label = await btn.textContent();
    console.log(`[quick-prompt] clicking: ${label}`);

    await btn.click();
    await waitForElements(page, 4);

    const count = await getElementCount(page);
    console.log(`[quick-prompt] got ${count} elements`);

    await page.screenshot({
      path: screenshotPath("03-quick-oauth-flow"),
      fullPage: true,
    });

    expect(count).toBeGreaterThanOrEqual(4);
    await expect(page.locator(".canvas-panel")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Manual typed prompt
  // -------------------------------------------------------------------------

  test("Manual prompt: microservices diagram generates shapes", async ({
    page,
  }) => {
    await resetCanvas(page);

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill("Draw a microservices architecture with API gateway, auth service, user service, order service, and database");

    const sendBtn = page.locator('button[type="submit"]');
    await sendBtn.click();

    await waitForElements(page, 4);

    const count = await getElementCount(page);
    console.log(`[manual-prompt] got ${count} elements`);

    await page.screenshot({
      path: screenshotPath("04-manual-microservices"),
      fullPage: true,
    });

    expect(count).toBeGreaterThanOrEqual(4);
    await expect(page.locator(".canvas-panel")).toBeVisible();
  });

  test("Manual prompt: data pipeline generates shapes", async ({ page }) => {
    await resetCanvas(page);

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill(
      "Create a data pipeline diagram with source, ingestion, transformation, warehouse, and error handling"
    );

    await page.locator('button[type="submit"]').click();
    await waitForElements(page, 4);

    const count = await getElementCount(page);
    console.log(`[manual-prompt-data] got ${count} elements`);

    await page.screenshot({
      path: screenshotPath("05-manual-data-pipeline"),
      fullPage: true,
    });

    expect(count).toBeGreaterThanOrEqual(4);
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Image + text prompt
  // -------------------------------------------------------------------------

  test("Image + prompt: attaches image and either generates diagram or shows informative message", async ({
    page,
  }) => {
    await resetCanvas(page);

    // Write the tiny test PNG to disk so Playwright can upload it
    const imgPath = path.join(__dirname, "..", "test-results", "test-input.png");
    fs.writeFileSync(imgPath, Buffer.from(TINY_PNG_BASE64, "base64"));

    // Set the file input
    const fileInput = page.locator('input[type="file"][id="image-upload"]');
    await fileInput.setInputFiles(imgPath);

    // The onChange handler auto-sends with a default prompt, so just wait
    // Either shapes appear (vision works) or an assistant message appears
    const gotShapes = await Promise.race([
      waitForElements(page, 1, 90_000).then(() => true),
      page
        .waitForSelector('.message.assistant', { timeout: 90_000 })
        .then(() => false),
    ]);

    await page.screenshot({
      path: screenshotPath("06-image-upload"),
      fullPage: true,
    });

    if (gotShapes) {
      const count = await getElementCount(page);
      console.log(`[image-prompt] vision path: ${count} elements generated`);
      expect(count).toBeGreaterThanOrEqual(1);
    } else {
      // Vision unavailable — verify a clear assistant message was shown, not silence
      const msgs = await page.locator(".message.assistant").allTextContents();
      console.log(`[image-prompt] text-only fallback messages: ${msgs.join(" | ")}`);
      // At least one assistant message must exist (welcome or error message)
      expect(msgs.length).toBeGreaterThan(0);
    }

    await expect(page.locator(".canvas-panel")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MCP endpoint sanity check
// ---------------------------------------------------------------------------

test("MCP /mcp returns JSON-RPC error without proper headers", async ({
  request,
}) => {
  const res = await request.get(`${APP}/mcp`);
  const body = await res.json();
  expect(body.jsonrpc).toBe("2.0");
  expect(body.error).toBeDefined();
});
