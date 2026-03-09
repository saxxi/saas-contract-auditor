import { test, expect } from '@playwright/test';

test.describe('Demo page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
  });

  test('page loads with navbar', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByRole('link', { name: 'SaaS Contract Auditor' })).toBeVisible();
  });

  test('has split layout with app content and chat areas', async ({ page }) => {
    // The AppLayout renders two side-by-side divs inside a flex row
    const layoutContainer = page.locator('div.flex.flex-row').first();
    await expect(layoutContainer).toBeVisible();
  });

  test('navbar Demo link is active on demo page', async ({ page }) => {
    const demoLink = page.getByRole('link', { name: 'Demo' });
    await expect(demoLink).toBeVisible();
    // Active link has blue color class
    await expect(demoLink).toHaveClass(/text-blue-600/);
  });
});
