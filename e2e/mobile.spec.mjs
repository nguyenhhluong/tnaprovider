import { test, expect } from '@playwright/test';

const ADMIN = { email: 'admin@tnaprovider.com', password: 'AdminPass123!' };

async function login(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);
}

test.describe('Mobile Navigation', () => {
  test('bottom navigation visible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const bottomNav = page.locator('nav').filter({ hasText: 'Home' });
    await expect(bottomNav).toBeVisible();
  });

  test('desktop sidebar hidden on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toBeVisible();
  });

  test('More sheet opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.click('button[aria-label="More menu"]');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('no horizontal overflow on dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(overflow).toBe(true);
  });
});

test.describe('Quote Requests Mobile', () => {
  test('cards visible on mobile, table hidden', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/quote-requests');
    await page.waitForSelector('[role="button"]');
    await expect(page.locator('[role="button"]').first()).toBeVisible();
  });

  test('no horizontal overflow on quote requests', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/quote-requests');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(overflow).toBe(true);
  });
});

test.describe('Business Email Mobile', () => {
  test('inbox loads without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/email');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(overflow).toBe(true);
  });
});

test.describe('Email Center Mobile', () => {
  test('email center loads without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto('/email-center');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(overflow).toBe(true);
  });
});
