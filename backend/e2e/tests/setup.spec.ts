import { test, expect } from '@playwright/test';

test.describe('E2E Test Setup', () => {
  test('should verify backend is running', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
  });

  test('should verify mobile app is accessible', async ({ page }) => {
    await page.goto('/');

    // Wait for React app to load
    await page.waitForLoadState('networkidle');

    // Check if the page title or main element exists
    const title = await page.title();
    expect(title).toBeDefined();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should verify mobile app loads without errors', async ({ page }) => {
    // Monitor console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Allow for normal React warnings but fail on actual errors
    const criticalErrors = errors.filter(error =>
      !error.includes('Warning:') &&
      !error.includes('deprecated') &&
      !error.includes('react-dom.development.js')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});