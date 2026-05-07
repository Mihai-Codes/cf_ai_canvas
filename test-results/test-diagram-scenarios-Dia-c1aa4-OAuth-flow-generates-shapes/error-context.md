# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test/diagram-scenarios.spec.ts >> Diagram generation — all three input paths >> Quick prompt: MCP OAuth flow generates shapes
- Location: test/diagram-scenarios.spec.ts:180:3

# Error details

```
TimeoutError: page.waitForFunction: Timeout 90000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - heading "cf_ai_canvas" [level=1] [ref=e7]
        - paragraph [ref=e8]: Default session
      - generic [ref=e9]: connected
    - generic [ref=e10]:
      - button "Draw a login flow with success and error paths" [ref=e11] [cursor=pointer]
      - button "Create a Cloudflare Workers AI architecture diagram" [ref=e12] [cursor=pointer]
      - button "Draw a 4-step MCP OAuth flow" [ref=e13] [cursor=pointer]
    - generic [ref=e14]:
      - generic [ref=e15]:
        - strong [ref=e16]: user
        - generic [ref=e17]: Draw a 4-step MCP OAuth flow
      - generic [ref=e18]:
        - strong [ref=e19]: assistant
        - generic [ref=e20]: A flowchart diagram was created.
    - generic [ref=e21]:
      - textbox "Draw a microservices diagram..." [ref=e22]
      - generic [ref=e23]:
        - button "Clear chat" [ref=e24] [cursor=pointer]
        - button "Reset canvas" [ref=e25] [cursor=pointer]
        - button "Attach Image" [ref=e26] [cursor=pointer]
        - button "Send" [disabled] [ref=e27]
  - generic [ref=e28]:
    - generic [ref=e29]:
      - generic [ref=e30]:
        - heading "Live Canvas" [level=2] [ref=e31]
        - paragraph [ref=e32]: 10 elements
      - code [ref=e33]: /mcp
    - application "tldraw" [ref=e35]
```

# Test source

```ts
  1   | /**
  2   |  * diagram-scenarios.spec.ts
  3   |  *
  4   |  * End-to-end smoke tests for all three diagram generation paths:
  5   |  *   1. Quick-prompt button click (auto-sends)
  6   |  *   2. Manual typed prompt
  7   |  *   3. Image attached with text prompt
  8   |  *
  9   |  * Each test verifies that shapes actually appear in the canvas
  10  |  * (element counter > 0) after the LLM responds, then screenshots the result.
  11  |  */
  12  | import { test, expect, Page } from "@playwright/test";
  13  | import * as fs from "fs";
  14  | import * as path from "path";
  15  | 
  16  | const APP = "https://cf-ai-canvas.mc146.workers.dev";
  17  | 
  18  | /**
  19  |  * Download a real architecture-diagram PNG from Wikipedia Commons.
  20  |  * Falls back to an embedded micro-PNG if the download fails so the
  21  |  * test never breaks due to network issues.
  22  |  */
  23  | async function fetchDiagramImage(destPath: string): Promise<void> {
  24  |   // A real PNG from httpbin — stable test endpoint, always returns a valid PNG.
  25  |   // Content doesn't matter; we're testing the upload + vision pipeline works.
  26  |   const DIAGRAM_URL = "https://httpbin.org/image/png";
  27  | 
  28  |   try {
  29  |     const res = await fetch(DIAGRAM_URL, { signal: AbortSignal.timeout(8000) });
  30  |     if (!res.ok) throw new Error(`HTTP ${res.status}`);
  31  |     const buf = await res.arrayBuffer();
  32  |     fs.writeFileSync(destPath, Buffer.from(buf));
  33  |     console.log(
  34  |       `[image-test] downloaded real diagram (${buf.byteLength} bytes)`,
  35  |     );
  36  |   } catch (err) {
  37  |     console.warn(
  38  |       `[image-test] download failed (${err}), using embedded fallback`,
  39  |     );
  40  |     // 10x10 white PNG fallback
  41  |     const FALLBACK =
  42  |       "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk" +
  43  |       "+M9Qz0AEYBxVSF+FABJADveax3/VAAAAAElFTkSuQmCC";
  44  |     fs.writeFileSync(destPath, Buffer.from(FALLBACK, "base64"));
  45  |   }
  46  | }
  47  | 
  48  | function screenshotPath(name: string) {
  49  |   const dir = path.join(process.cwd(), "test-results");
  50  |   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  51  |   return path.join(dir, `${name}.png`);
  52  | }
  53  | 
  54  | /** Wait until the WebSocket is connected and the status indicator says "connected". */
  55  | async function waitForConnection(page: Page, timeout = 20_000) {
  56  |   await page.waitForSelector('[data-testid="connection-status"]', { timeout });
  57  |   await expect(page.locator('[data-testid="connection-status"]')).toHaveText(
  58  |     "connected",
  59  |     { timeout },
  60  |   );
  61  | }
  62  | 
  63  | /**
  64  |  * Wait until BOTH the element-count badge (DO state) AND the tldraw-shape-count
  65  |  * (actual tldraw renderer) show at least minCount.
  66  |  * This catches the split-brain case where DO has elements but tldraw doesn't render.
  67  |  */
  68  | async function waitForElements(page: Page, minCount = 1, timeout = 90_000) {
> 69  |   await page.waitForFunction(
      |              ^ TimeoutError: page.waitForFunction: Timeout 90000ms exceeded.
  70  |     (min) => {
  71  |       const badge = document.querySelector('[data-testid="element-count"]');
  72  |       const tl = document.querySelector('[data-testid="tldraw-shape-count"]');
  73  |       const badgeN = parseInt(badge?.textContent?.match(/(\d+)/)?.[1] ?? "0");
  74  |       const tlN = parseInt(tl?.textContent ?? "0");
  75  |       return badgeN >= min && tlN >= min;
  76  |     },
  77  |     minCount,
  78  |     { timeout },
  79  |   );
  80  | }
  81  | 
  82  | /** Extract the element count from the badge (DO state). */
  83  | async function getElementCount(page: Page): Promise<number> {
  84  |   const text = await page
  85  |     .locator('[data-testid="element-count"]')
  86  |     .textContent();
  87  |   const match = text?.match(/(\d+)/);
  88  |   return match ? parseInt(match[1], 10) : 0;
  89  | }
  90  | 
  91  | /** Extract the tldraw renderer shape count. */
  92  | async function getTldrawCount(page: Page): Promise<number> {
  93  |   const text = await page
  94  |     .locator('[data-testid="tldraw-shape-count"]')
  95  |     .textContent();
  96  |   return parseInt(text ?? "0");
  97  | }
  98  | 
  99  | /** Reset canvas between tests using the Reset canvas button. */
  100 | async function resetCanvas(page: Page) {
  101 |   const btn = page.locator('button:has-text("Reset canvas")');
  102 |   if (await btn.isVisible()) await btn.click();
  103 |   // Wait a moment for state to clear
  104 |   await page.waitForTimeout(500);
  105 | }
  106 | 
  107 | // ---------------------------------------------------------------------------
  108 | // Test setup
  109 | // ---------------------------------------------------------------------------
  110 | 
  111 | test.describe("Diagram generation — all three input paths", () => {
  112 |   test.beforeEach(async ({ page }) => {
  113 |     await page.goto(APP, { waitUntil: "domcontentloaded" });
  114 |     await waitForConnection(page);
  115 |   });
  116 | 
  117 |   // -------------------------------------------------------------------------
  118 |   // Scenario 1: Quick-prompt buttons (auto-send on click)
  119 |   // -------------------------------------------------------------------------
  120 | 
  121 |   test("Quick prompt: login flow generates shapes", async ({ page }) => {
  122 |     await resetCanvas(page);
  123 | 
  124 |     const btn = page.locator('[data-testid="quick-prompt"]').first();
  125 |     const label = await btn.textContent();
  126 |     console.log(`[quick-prompt] clicking: ${label}`);
  127 | 
  128 |     await btn.click();
  129 | 
  130 |     // Wait for the LLM to respond and shapes to appear
  131 |     await waitForElements(page, 3);
  132 | 
  133 |     const count = await getElementCount(page);
  134 |     const tlCount = await getTldrawCount(page);
  135 |     console.log(`[quick-prompt] badge=${count} tldraw=${tlCount}`);
  136 | 
  137 |     await page.screenshot({
  138 |       path: screenshotPath("01-quick-login-flow"),
  139 |       fullPage: true,
  140 |     });
  141 | 
  142 |     expect(count).toBeGreaterThanOrEqual(3);
  143 | 
  144 |     // Verify the canvas panel is still visible (not crashed / white-screened)
  145 |     await expect(page.locator(".canvas-panel")).toBeVisible();
  146 | 
  147 |     // Verify no --no-sandbox noise in any message
  148 |     const messages = await page.locator(".message").allTextContents();
  149 |     for (const m of messages) {
  150 |       expect(m).not.toMatch(/--no-sandbox/i);
  151 |     }
  152 |   });
  153 | 
  154 |   test("Quick prompt: Cloudflare Workers AI architecture generates shapes", async ({
  155 |     page,
  156 |   }) => {
  157 |     await resetCanvas(page);
  158 | 
  159 |     const buttons = page.locator('[data-testid="quick-prompt"]');
  160 |     const btn = buttons.nth(1); // "Create a Cloudflare Workers AI architecture diagram"
  161 |     const label = await btn.textContent();
  162 |     console.log(`[quick-prompt] clicking: ${label}`);
  163 | 
  164 |     await btn.click();
  165 |     await waitForElements(page, 4);
  166 | 
  167 |     const count = await getElementCount(page);
  168 |     const tlCount = await getTldrawCount(page);
  169 |     console.log(`[quick-prompt] badge=${count} tldraw=${tlCount}`);
```