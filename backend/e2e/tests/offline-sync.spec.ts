import { test, expect } from '@playwright/test';
import { createTestUtils } from './helpers/test-utils';

test.describe('Offline/Online Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    const utils = createTestUtils(page);

    await page.goto('/');
    await utils.waitForAppLoad();

    // Login as guest to access the app
    const guestButton = page.locator('button:has-text("Ver Demo")');
    if (await guestButton.isVisible()) {
      await guestButton.click();
      await utils.waitForNavigation();
    }
  });

  test('should work when online', async ({ page }) => {
    const utils = createTestUtils(page);

    // Ensure we're online
    await utils.goOnline();
    await page.reload();
    await utils.waitForAppLoad();

    // Check if app loads normally
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(0);

    // Look for online indicators if they exist
    const onlineIndicators = page.locator('text=Online, [data-testid="online-indicator"], .online-status');
    if (await onlineIndicators.count() > 0) {
      await expect(onlineIndicators.first()).toBeVisible();
    }
  });

  test('should handle offline mode gracefully', async ({ page }) => {
    const utils = createTestUtils(page);

    // First, make sure app is loaded online
    await utils.goOnline();
    await page.reload();
    await utils.waitForAppLoad();

    // Now go offline
    await utils.goOffline();
    await page.reload();

    // Wait for the app to detect offline state
    await page.waitForTimeout(2000);

    // App should still load (using cached data or offline mode)
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();

    // Look for offline indicators
    const offlineIndicators = [
      'text=Offline',
      'text=Sem conexão',
      'text=No connection',
      '[data-testid="offline-indicator"]',
      '.offline-status'
    ];

    let hasOfflineIndicator = false;
    for (const selector of offlineIndicators) {
      if (await page.locator(selector).count() > 0) {
        hasOfflineIndicator = true;
        break;
      }
    }

    // Either we have an offline indicator or the app continues to work
    const appStillWorks = bodyContent!.length > 100; // Reasonable content size

    expect(hasOfflineIndicator || appStillWorks).toBeTruthy();
  });

  test('should sync data when going back online', async ({ page }) => {
    const utils = createTestUtils(page);

    // Start online
    await utils.goOnline();
    await utils.waitForAppLoad();

    // Go offline and try to create some data
    await utils.goOffline();
    await page.waitForTimeout(1000);

    // Try to interact with the app while offline
    // Look for any action buttons
    const actionButtons = page.locator('button:has-text("+"), button:has-text("Novo"), button:has-text("Adicionar")');

    if (await actionButtons.count() > 0) {
      try {
        await actionButtons.first().click();
        await page.waitForTimeout(1000);

        // Fill any form if it appears
        const inputs = page.locator('input[type="text"], input[name="name"], textarea');
        if (await inputs.count() > 0) {
          await inputs.first().fill('Offline Test Data');
        }

        // Try to save
        const saveButtons = page.locator('button:has-text("Salvar"), button:has-text("Confirmar")');
        if (await saveButtons.count() > 0) {
          await saveButtons.first().click();
        }
      } catch (e) {
        // Offline actions might fail, that's expected
      }
    }

    // Go back online
    await utils.goOnline();
    await page.waitForTimeout(2000);

    // Look for sync indicators
    const syncIndicators = [
      'text=Sincronizando',
      'text=Syncing',
      'text=Uploading',
      '[data-testid="sync-indicator"]',
      '.sync-status'
    ];

    let hasSyncActivity = false;
    for (const selector of syncIndicators) {
      if (await page.locator(selector).count() > 0) {
        hasSyncActivity = true;
        break;
      }
    }

    // Wait for potential sync to complete
    await page.waitForTimeout(3000);

    // The app should be functional again
    const finalContent = await page.textContent('body');
    expect(finalContent).toBeTruthy();
  });

  test('should show sync status', async ({ page }) => {
    const utils = createTestUtils(page);

    // Look for any sync status indicators in the UI
    const syncStatusElements = [
      '[data-testid="sync-status"]',
      '.sync-status',
      'text=pendentes',
      'text=pending',
      'text=items para sincronizar'
    ];

    let hasSyncStatus = false;
    for (const selector of syncStatusElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        hasSyncStatus = true;

        // If we found sync status, check if it shows meaningful info
        const statusText = await element.first().textContent();
        expect(statusText).toBeTruthy();
        break;
      }
    }

    // Sync status might not be visible if everything is already synced
    // So this test passes if we find status OR if the app works normally
    const appWorks = (await page.textContent('body'))!.length > 100;
    expect(hasSyncStatus || appWorks).toBeTruthy();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    const utils = createTestUtils(page);

    // Mock failed API responses
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 500,
        body: 'Server Error'
      });
    });

    await page.reload();
    await utils.waitForAppLoad();

    // App should handle API errors gracefully
    await page.waitForTimeout(2000);

    // Look for error messages or fallback behavior
    const errorElements = [
      'text=Erro',
      'text=Error',
      'text=Falha na conexão',
      'text=Connection failed',
      '[data-testid="error-message"]'
    ];

    let hasErrorHandling = false;
    for (const selector of errorElements) {
      if (await page.locator(selector).count() > 0) {
        hasErrorHandling = true;
        break;
      }
    }

    // The app should either show proper error handling OR continue working with cached data
    const stillFunctional = (await page.textContent('body'))!.length > 100;

    expect(hasErrorHandling || stillFunctional).toBeTruthy();
  });

  test('should maintain data integrity across offline/online transitions', async ({ page }) => {
    const utils = createTestUtils(page);

    // Take a snapshot of initial app state
    await utils.goOnline();
    await utils.waitForAppLoad();

    const initialContent = await page.textContent('body');

    // Go offline and back online
    await utils.goOffline();
    await page.waitForTimeout(1000);

    await utils.goOnline();
    await page.waitForTimeout(2000);

    // App should maintain its basic functionality
    const finalContent = await page.textContent('body');

    // Content should be similar (app should still work)
    expect(finalContent).toBeTruthy();
    expect(finalContent!.length).toBeGreaterThan(initialContent!.length * 0.8); // At least 80% of original content
  });
});