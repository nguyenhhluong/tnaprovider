import { test, expect } from './fixtures/auth.mjs';

async function expectNoOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe('Mobile Navigation Shell', () => {
  test('bottom navigation visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/platform/dashboard');
    await expect(page.getByRole('link', { name: /Home/i })).toBeVisible();
    await expectNoOverflow(page);
  });

  test('More sheet opens and Escape closes it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/platform/dashboard');
    await page.click('button[aria-label="More menu"]');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expectNoOverflow(page);
  });

  test('no horizontal overflow on dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/platform/dashboard');
    await expectNoOverflow(page);
  });
});

test.describe('Quote Requests Mobile', () => {
  test('cards visible on mobile and no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/platform/quote-requests');
    await page.waitForSelector('[role="button"]');
    const cards = page.getByRole('button').filter({ has: page.locator('[class*="font-semibold"]') });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await expectNoOverflow(page);
  });
});

test.describe('Business Email Mobile', () => {
  test('inbox loads without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/platform/email');
    await page.waitForTimeout(2000);
    await expectNoOverflow(page);
  });
});

test.describe('Email Center Mobile', () => {
  test('loads without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/platform/email-center');
    await page.waitForTimeout(1000);
    await expectNoOverflow(page);
  });
});

test.describe('Route Overflow Tests', () => {
  const routes = [
    '/platform/dashboard',
    '/platform/projects',
    '/platform/quotes',
    '/platform/quote-requests',
    '/platform/users',
    '/platform/email',
    '/platform/email-center',
    '/platform/tasks',
    '/platform/documents',
    '/platform/reports',
    '/platform/settings',
  ];

  for (const route of routes) {
    test(`${route} has no horizontal overflow at 390px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      await page.waitForTimeout(1000);
      await expectNoOverflow(page);
    });
  }
});
