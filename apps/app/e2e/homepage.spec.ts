import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays hero heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /are your saas clients still on the right contract/i })
    ).toBeVisible();
  });

  test('displays Generate Report button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /generate report/i })
    ).toBeVisible();
  });

  test('displays Open Report button (cached report pre-loaded)', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /open report/i })
    ).toBeVisible();
  });

  test('textarea is pre-filled with example data', async ({ page }) => {
    const textarea = page.locator('textarea[spellcheck="false"]');
    await expect(textarea).toBeVisible();
    // Example 1 is pre-filled by default
    await expect(textarea).toHaveValue(/Northstar Logistics/);
  });

  test('Example buttons switch textarea content', async ({ page }) => {
    const textarea = page.locator('textarea[spellcheck="false"]');

    // Click Example 2
    await page.getByRole('button', { name: 'Example 2' }).click();
    await expect(textarea).toHaveValue(/Velocity Logistics/);

    // Click Example 1
    await page.getByRole('button', { name: 'Example 1' }).click();
    await expect(textarea).toHaveValue(/Northstar Logistics/);
  });

  test('has "See the full demo" link pointing to /demo', async ({ page }) => {
    const link = page.getByRole('link', { name: /see the full demo/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/demo');
  });

  test('navbar is visible with navigation links', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByRole('link', { name: 'SaaS Contract Auditor' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: 'Demo' })).toBeVisible();
  });
});
