import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('navigate from homepage to demo via "See the full demo" link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /see the full demo/i }).click();
    await expect(page).toHaveURL('/demo');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('navbar Home link navigates to homepage from demo', async ({ page }) => {
    await page.goto('/demo');
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: /are your saas clients still on the right contract/i })
    ).toBeVisible();
  });

  test('navbar Demo link navigates to demo from homepage', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Demo' }).click();
    await expect(page).toHaveURL('/demo');
  });

  test('navbar logo links to homepage', async ({ page }) => {
    await page.goto('/demo');
    await page.getByRole('link', { name: 'Contract Auditor' }).click();
    await expect(page).toHaveURL('/');
  });
});
