# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test-visual-validation.spec.ts >> Visual Diagram Generation Validation >> should generate different diagrams for different prompt types
- Location: test-visual-validation.spec.ts:15:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.screenshot: Test timeout of 30000ms exceeded.
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

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
    - generic [ref=e15]:
      - strong [ref=e16]: assistant
      - generic [ref=e17]: A flowchart diagram was created.
    - generic [ref=e18]:
      - textbox "Draw a microservices diagram..." [ref=e19]
      - generic [ref=e20]:
        - button "Clear chat" [ref=e21] [cursor=pointer]
        - button "Reset canvas" [ref=e22] [cursor=pointer]
        - button "Attach Image" [ref=e23] [cursor=pointer]
        - button "Send" [disabled] [ref=e24]
  - generic [ref=e25]:
    - generic [ref=e26]:
      - generic [ref=e27]:
        - heading "Live Canvas" [level=2] [ref=e28]
        - paragraph [ref=e29]: 16 elements
      - code [ref=e30]: /mcp
    - application "tldraw" [ref=e32]:
      - generic [ref=e33]:
        - img
        - generic [ref=e36]:
          - generic:
            - img
          - generic:
            - img
            - generic [ref=e39]: Client Layer
          - generic:
            - img
            - generic [ref=e42]: Cloudflare Worker
          - generic:
            - img
            - paragraph [ref=e45]: tldraw Canvas
          - generic:
            - img
            - paragraph [ref=e48]: Workers AI
          - generic:
            - img
          - generic:
            - img
          - generic:
            - img
            - paragraph [ref=e51]: ChatAgent DO
          - generic:
            - img
            - paragraph [ref=e54]: React UI
          - generic:
            - img
            - generic [ref=e57]: Cloudflare Services
          - generic:
            - img
            - paragraph [ref=e60]: Worker Router
          - generic:
            - img
            - paragraph [ref=e63]: CanvasMCP DO
          - generic:
            - img
            - paragraph [ref=e66]: Workers KV
          - paragraph [ref=e70]: "Architecture: Create a Cloudflare Workers AI architecture diagram"
          - generic:
            - img
          - generic:
            - img
      - generic:
        - button "Move focus to canvas" [ref=e71] [cursor=pointer]
        - generic:
          - generic:
            - navigation:
              - generic:
                - button "Menu" [ref=e72] [cursor=pointer]:
                  - img [ref=e73]
                - button "Page 1" [ref=e74] [cursor=pointer]:
                  - generic [ref=e75]: Page 1
                  - img [ref=e76]
                - toolbar "Actions"
        - generic:
          - generic:
            - toolbar "Navigation" [ref=e78]:
              - button "Zoom — 66%" [ref=e79] [cursor=pointer]:
                - generic [ref=e80]: 66%
              - button "Toggle minimap" [ref=e81] [cursor=pointer]:
                - img [ref=e82]
            - toolbar "Tools" [ref=e83]:
              - generic [ref=e84]:
                - button "Select — V" [pressed] [ref=e85] [cursor=pointer]:
                  - img [ref=e86]
                - button "Hand — H" [ref=e87] [cursor=pointer]:
                  - img [ref=e88]
                - button "Laser — K" [ref=e89] [cursor=pointer]:
                  - img [ref=e90]
        - region "Notifications (F8)":
          - list
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import path from 'path';
  3   | import fs from 'fs';
  4   | import { fileURLToPath } from 'url';
  5   | 
  6   | test.describe('Visual Diagram Generation Validation', () => {
  7   |   // Ensure test-results directory exists
  8   |   const __filename = fileURLToPath(import.meta.url);
  9   |   const __dirname = path.dirname(__filename);
  10  |   const testResultsDir = path.join(__dirname, 'test-results');
  11  |   if (!fs.existsSync(testResultsDir)) {
  12  |     fs.mkdirSync(testResultsDir, { recursive: true });
  13  |   }
  14  | 
  15  |   test('should generate different diagrams for different prompt types', async ({ page }) => {
  16  |     await page.goto('https://cf-ai-canvas.mc146.workers.dev');
  17  |     await page.waitForSelector('.chat-panel', { timeout: 10000 });
  18  | 
  19  |     const testCases = [
  20  |       {
  21  |         name: 'login-flow',
  22  |         prompt: 'Draw a login flow with success and error paths',
  23  |         expectedElements: 6-10
  24  |       },
  25  |       {
  26  |         name: 'architecture',
  27  |         prompt: 'Create a Cloudflare Workers AI architecture diagram',
  28  |         expectedElements: 8-15
  29  |       },
  30  |       {
  31  |         name: 'oauth-flow',
  32  |         prompt: 'Draw a 4-step MCP OAuth flow',
  33  |         expectedElements: 6-12
  34  |       },
  35  |       {
  36  |         name: 'microservices',
  37  |         prompt: 'Create a microservices architecture with API gateway and database',
  38  |         expectedElements: 6-12
  39  |       }
  40  |     ];
  41  | 
  42  |     for (const testCase of testCases) {
  43  |       // Clear previous state
  44  |       const clearButton = page.locator('button:has-text("Clear chat")');
  45  |       await clearButton.click();
  46  |       await page.waitForTimeout(500);
  47  | 
  48  |       // Reset canvas
  49  |       const resetButton = page.locator('button:has-text("Reset canvas")');
  50  |       await resetButton.click();
  51  |       await page.waitForTimeout(500);
  52  | 
  53  |       // Send the prompt
  54  |       const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
  55  |       await textarea.fill(testCase.prompt);
  56  |       
  57  |       const sendButton = page.locator('button:has-text("Send")');
  58  |       await sendButton.click();
  59  | 
  60  |       // Wait for response and canvas update
  61  |       await page.waitForSelector('.message.assistant', { timeout: 30000 });
  62  |       await page.waitForTimeout(2000); // Extra time for canvas rendering
  63  | 
  64  |       // Capture screenshot
  65  |       const screenshotPath = path.join(testResultsDir, `${testCase.name}.png`);
> 66  |       await page.screenshot({ path: screenshotPath, fullPage: true });
      |                  ^ Error: page.screenshot: Test timeout of 30000ms exceeded.
  67  |       console.log(`Captured screenshot: ${testCase.name}.png`);
  68  | 
  69  |       // Verify canvas has elements
  70  |       const canvasPanel = page.locator('.canvas-panel');
  71  |       await expect(canvasPanel).toBeVisible();
  72  |       
  73  |       // Verify canvas is visible (primary indicator of successful generation)
  74  |       await expect(canvasPanel).toBeVisible();
  75  |     }
  76  |   });
  77  | 
  78  |   test('should generate different diagrams for quick prompt suggestions', async ({ page }) => {
  79  |     await page.goto('https://cf-ai-canvas.mc146.workers.dev');
  80  |     await page.waitForSelector('.chat-panel', { timeout: 10000 });
  81  | 
  82  |     const quickPrompts = [
  83  |       'Draw a login flow with success and error paths',
  84  |       'Create a Cloudflare Workers AI architecture diagram',
  85  |       'Draw a 4-step MCP OAuth flow'
  86  |     ];
  87  | 
  88  |     for (let i = 0; i < quickPrompts.length; i++) {
  89  |       const prompt = quickPrompts[i];
  90  |       
  91  |       // Click the quick prompt button
  92  |       const promptButton = page.locator(`button:has-text("${prompt}")`);
  93  |       await promptButton.click();
  94  |       
  95  |       // Send the prompt
  96  |       const sendButton = page.locator('button:has-text("Send")');
  97  |       await sendButton.click();
  98  | 
  99  |       // Wait for response
  100 |       await page.waitForSelector('.message.assistant', { timeout: 30000 });
  101 |       await page.waitForTimeout(2000);
  102 | 
  103 |       // Capture screenshot
  104 |       const screenshotPath = path.join(testResultsDir, `quick-prompt-${i}.png`);
  105 |       await page.screenshot({ path: screenshotPath, fullPage: true });
  106 |       console.log(`Captured quick prompt screenshot ${i}.png`);
  107 | 
  108 |       // Clear for next test
  109 |       const clearButton = page.locator('button:has-text("Clear chat")');
  110 |       await clearButton.click();
  111 |       await page.waitForTimeout(500);
  112 |     }
  113 |   });
  114 | 
  115 |   test('should verify attach image button and multimodal workflow', async ({ page }) => {
  116 |     await page.goto('https://cf-ai-canvas.mc146.workers.dev');
  117 |     await page.waitForSelector('.chat-panel', { timeout: 10000 });
  118 | 
  119 |     // Verify attach image button exists
  120 |     const attachButton = page.locator('button:has-text("Attach Image")');
  121 |     await expect(attachButton).toBeVisible();
  122 |     await expect(attachButton).toBeEnabled();
  123 | 
  124 |     // Capture UI screenshot
  125 |     const screenshotPath = path.join(testResultsDir, 'multimodal-ui.png');
  126 |     await page.screenshot({ path: screenshotPath, fullPage: true });
  127 |     console.log('Captured multimodal UI screenshot');
  128 |   });
  129 | 
  130 |   test('should handle edge cases gracefully', async ({ page }) => {
  131 |     await page.goto('https://cf-ai-canvas.mc146.workers.dev');
  132 |     await page.waitForSelector('.chat-panel', { timeout: 10000 });
  133 | 
  134 |     const edgeCases = [
  135 |       'Draw me something', // Vague
  136 |       'Create a diagram', // Minimal
  137 |       'I need a very complex enterprise architecture with 50 components', // Overly complex
  138 |     ];
  139 | 
  140 |     for (let i = 0; i < edgeCases.length; i++) {
  141 |       const prompt = edgeCases[i];
  142 |       
  143 |       // Clear previous state
  144 |       const clearButton = page.locator('button:has-text("Clear chat")');
  145 |       await clearButton.click();
  146 |       await page.waitForTimeout(500);
  147 | 
  148 |       // Send edge case prompt
  149 |       const textarea = page.locator('textarea[placeholder="Draw a microservices diagram..."]');
  150 |       await textarea.fill(prompt);
  151 |       
  152 |       const sendButton = page.locator('button:has-text("Send")');
  153 |       await sendButton.click();
  154 | 
  155 |       // Wait for response
  156 |       await page.waitForSelector('.message.assistant', { timeout: 30000 });
  157 |       await page.waitForTimeout(2000);
  158 | 
  159 |       // Capture screenshot
  160 |       const screenshotPath = path.join(testResultsDir, `edge-case-${i}.png`);
  161 |       await page.screenshot({ path: screenshotPath, fullPage: true });
  162 |       console.log(`Captured edge case screenshot ${i}.png`);
  163 |     }
  164 |   });
  165 | });
```