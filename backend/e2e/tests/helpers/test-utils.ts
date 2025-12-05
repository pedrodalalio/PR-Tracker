import { Page, expect } from '@playwright/test';

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for the app to load completely
   */
  async waitForAppLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for React to finish rendering
    await this.page.waitForFunction(() => {
      return document.readyState === 'complete';
    });
  }

  /**
   * Wait for an element to be visible with timeout
   */
  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout
    });
  }

  /**
   * Fill form field by label or placeholder
   */
  async fillField(label: string, value: string) {
    const input = this.page.locator(`input[placeholder*="${label}"], input[aria-label*="${label}"]`);
    await input.fill(value);
  }

  /**
   * Click button by text content
   */
  async clickButton(text: string) {
    const button = this.page.locator(`button:has-text("${text}"), [role="button"]:has-text("${text}")`);
    await button.click();
  }

  /**
   * Wait for navigation or page change
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if text is visible on the page
   */
  async expectTextVisible(text: string) {
    await expect(this.page.locator(`text=${text}`)).toBeVisible();
  }

  /**
   * Check if element exists
   */
  async expectElementExists(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * Get all console errors from the page
   */
  getConsoleErrors(): string[] {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * Mock network requests
   */
  async mockApiResponse(url: string, response: any) {
    await this.page.route(url, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Simulate offline mode
   */
  async goOffline() {
    await this.page.context().setOffline(true);
  }

  /**
   * Simulate online mode
   */
  async goOnline() {
    await this.page.context().setOffline(false);
  }
}

export const createTestUtils = (page: Page) => new TestUtils(page);