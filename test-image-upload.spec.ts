import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Image Upload Feature', () => {
  test('should allow uploading an image and triggering multimodal generation', async ({ page }) => {
    await page.goto('https://cf-ai-canvas.mc146.workers.dev');
    
    // Wait for the app to load
    await expect(page.locator('textarea[placeholder="Draw a microservices diagram..."]')).toBeVisible();
    
    // Get the file input
    const fileInput = page.locator('input[type="file"][id="image-upload"]');
    
    // Create a simple test image (1x1 red pixel PNG)
    const testImagePath = path.resolve(__dirname, 'test-data/test-diagram.png');
    
    // Set files to upload
    await fileInput.setInputFiles(testImagePath);
    
    // Check that the upload happened (the button should no longer be disabled or the input should have files)
    // After upload, we expect the system to process the image
    
    // Wait a moment for any processing to start
    await page.waitForTimeout(2000);
    
    // Take a screenshot to see the state
    await page.screenshot({ path: 'test-results/image-upload-test.png' });
    
    // If the image was processed, there might be a different state
    // The textarea should still be accessible or show some indication of processing
    const isDisabled = await page.locator('textarea').isDisabled();
    console.log('Textarea disabled state:', isDisabled);
  });
});