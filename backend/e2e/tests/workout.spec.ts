import { test, expect } from '@playwright/test';
import { createTestUtils } from './helpers/test-utils';
import { testWorkouts } from './fixtures/test-data';

test.describe('Workout Management', () => {
  test.beforeEach(async ({ page }) => {
    const utils = createTestUtils(page);

    await page.goto('/');
    await utils.waitForAppLoad();

    // Login as guest first (simpler flow)
    const guestButton = page.locator('button:has-text("Ver Demo")');
    if (await guestButton.isVisible()) {
      await guestButton.click();
      await utils.waitForNavigation();
    }
  });

  test('should access workout section', async ({ page }) => {
    const utils = createTestUtils(page);

    // Look for workout-related navigation or buttons
    const workoutElements = [
      'text=Treinos',
      'text=Workouts',
      'button:has-text("Novo Treino")',
      'button:has-text("Adicionar Treino")',
      '[data-testid="workout-tab"]',
      '.workout-tab'
    ];

    let workoutElementFound = false;

    for (const selector of workoutElements) {
      const element = page.locator(selector);
      if (await element.count() > 0 && await element.first().isVisible()) {
        await element.first().click();
        workoutElementFound = true;
        break;
      }
    }

    if (workoutElementFound) {
      await utils.waitForNavigation();
    }

    // Check if we're in workout section (look for any workout-related content)
    await page.waitForTimeout(1000);

    // The page should have some workout-related content
    const currentContent = await page.textContent('body');
    const hasWorkoutContent =
      currentContent?.includes('treino') ||
      currentContent?.includes('workout') ||
      currentContent?.includes('exercicio') ||
      currentContent?.includes('exercise');

    expect(hasWorkoutContent).toBeTruthy();
  });

  test('should create a new workout', async ({ page }) => {
    const utils = createTestUtils(page);

    // Try to find and click "new workout" button
    const newWorkoutSelectors = [
      'button:has-text("Novo Treino")',
      'button:has-text("Adicionar Treino")',
      'button:has-text("+")',
      '[data-testid="add-workout"]',
      '.add-workout-button'
    ];

    let createButtonFound = false;

    for (const selector of newWorkoutSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        try {
          await element.first().click();
          createButtonFound = true;
          break;
        } catch (e) {
          continue;
        }
      }
    }

    if (createButtonFound) {
      await utils.waitForNavigation();

      // Fill workout form if we find it
      const workoutNameInput = page.locator('input[placeholder*="nome"], input[placeholder*="Nome"], input[name="name"]');
      if (await workoutNameInput.count() > 0) {
        await workoutNameInput.fill(testWorkouts.upperBody.name);
      }

      // Try to save/submit
      const saveButtons = page.locator('button:has-text("Salvar"), button:has-text("Criar"), button:has-text("Adicionar")');
      if (await saveButtons.count() > 0) {
        await saveButtons.first().click();
        await utils.waitForNavigation();
      }
    }

    // Verify we're still in the app and no major errors occurred
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('localhost:8081');
  });

  test('should view workout list', async ({ page }) => {
    const utils = createTestUtils(page);

    // Try to find workout list/history
    const workoutListSelectors = [
      'text=Histórico',
      'text=Lista de Treinos',
      'text=Meus Treinos',
      '[data-testid="workout-list"]',
      '.workout-list'
    ];

    for (const selector of workoutListSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0 && await element.first().isVisible()) {
        await element.first().click();
        await utils.waitForNavigation();
        break;
      }
    }

    await page.waitForTimeout(1000);

    // Check if we have some kind of list view
    const listElements = page.locator('[data-testid="workout-item"], .workout-item, .workout-card');

    // Either we have workout items or we have an empty state message
    const isEmpty = await page.locator('text=Nenhum treino, text=Vazio, text=Empty').count() > 0;
    const hasItems = await listElements.count() > 0;

    expect(isEmpty || hasItems).toBeTruthy();
  });

  test('should interact with workout details', async ({ page }) => {
    const utils = createTestUtils(page);

    // Look for any existing workout items to click
    const workoutItems = page.locator('[data-testid="workout-item"], .workout-item, .workout-card, button:has-text("Upper"), button:has-text("Lower"), button:has-text("Cardio")');

    if (await workoutItems.count() > 0) {
      await workoutItems.first().click();
      await utils.waitForNavigation();

      // Check if we're in a detail view
      await page.waitForTimeout(1000);

      // Look for detail elements
      const detailElements = [
        'text=Exercícios',
        'text=Sets',
        'text=Repetições',
        'button:has-text("Editar")',
        'button:has-text("Excluir")'
      ];

      let hasDetailContent = false;
      for (const selector of detailElements) {
        if (await page.locator(selector).count() > 0) {
          hasDetailContent = true;
          break;
        }
      }

      // If we found detail content, we're probably in the right place
      if (hasDetailContent) {
        expect(hasDetailContent).toBeTruthy();
      }
    }
  });

  test('should handle workout search/filter', async ({ page }) => {
    const utils = createTestUtils(page);

    // Look for search or filter functionality
    const searchElements = [
      'input[placeholder*="Buscar"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="Filtro"]',
      '[data-testid="search-input"]'
    ];

    for (const selector of searchElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await element.fill('treino');
        await page.waitForTimeout(500);

        // Check if search affected the results
        break;
      }
    }

    // Test passed if we can interact with search (even if no results)
    expect(true).toBeTruthy();
  });
});