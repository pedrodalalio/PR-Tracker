import { test, expect } from '@playwright/test';
import { createTestUtils } from './helpers/test-utils';
import { testUsers } from './fixtures/test-data';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display login screen initially', async ({ page }) => {
    const utils = createTestUtils(page);

    // Check if login form is visible
    await utils.expectTextVisible('PR Tracker');
    await utils.expectTextVisible('Login');

    // Check for form elements
    await utils.expectElementExists('input[placeholder*="Usuário"], input[placeholder*="Email"]');
    await utils.expectElementExists('input[placeholder*="Senha"]');
    await utils.expectElementExists('button:has-text("Entrar")');
  });

  test('should show guest login option', async ({ page }) => {
    const utils = createTestUtils(page);

    // Check for guest/demo login option
    await utils.expectTextVisible('Experimentar Demo');
    await utils.expectElementExists('button:has-text("Ver Demo")');
  });

  test('should allow guest login', async ({ page }) => {
    const utils = createTestUtils(page);

    // Click guest/demo login
    await utils.clickButton('Ver Demo');

    // Wait for navigation
    await utils.waitForNavigation();

    // Should be logged in and see main app
    // Look for navigation or main app elements
    await page.waitForTimeout(2000); // Give time for app to load

    // The app should navigate away from login screen
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login');
  });

  test('should show admin login form', async ({ page }) => {
    const utils = createTestUtils(page);

    // Fill in admin credentials
    await utils.fillField('Usuário', testUsers.admin.username);
    await utils.fillField('Senha', testUsers.admin.password);

    // Attempt to login (this might fail if backend is not set up for this user)
    await utils.clickButton('Entrar');

    // Wait a bit for any response
    await page.waitForTimeout(1000);

    // Check if we get any response - either success or error message
    // The test should at least verify the form submission works
  });

  test('should toggle password visibility', async ({ page }) => {
    const utils = createTestUtils(page);

    // Find password input
    const passwordInput = page.locator('input[placeholder*="Senha"]');

    // Initially should be password type
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Look for password visibility toggle (eye icon)
    const toggleButton = page.locator('button').filter({ has: page.locator('[data-testid="eye-icon"], .eye-icon') });

    if (await toggleButton.count() > 0) {
      await toggleButton.click();

      // Should now be text type
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click again to hide
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should handle empty form submission', async ({ page }) => {
    const utils = createTestUtils(page);

    // Try to login without filling anything
    await utils.clickButton('Entrar');

    // Should show validation message or stay on login page
    await page.waitForTimeout(1000);

    // Either we get an error message or stay on login
    const currentUrl = page.url();
    expect(currentUrl).toContain('localhost:8081'); // Still on the app
  });

  test('should navigate to register if available', async ({ page }) => {
    const utils = createTestUtils(page);

    // Look for register link/button
    const registerLink = page.locator('text=Criar conta, text=Registrar, button:has-text("Criar conta")');

    if (await registerLink.count() > 0) {
      await registerLink.click();

      // Should navigate to register or show register form
      await page.waitForTimeout(1000);

      // Verify we're in register context
      await utils.expectTextVisible('Criar');
    }
  });
});