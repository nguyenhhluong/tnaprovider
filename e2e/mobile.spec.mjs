import { test, expect } from './fixtures/auth.mjs';
import { setupConsoleGate } from './support/consoleGate.mjs';

async function expectNoOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe('Mobile Navigation Shell', () => {
  test('bottom navigation visible and no overflow', async ({ adminPage }) => {
    const gate = await setupConsoleGate(adminPage);
    await adminPage.goto('/platform/dashboard');
    await expect(adminPage.locator('[data-testid="mobile-bottom-nav"]')).toBeVisible();
    await expectNoOverflow(adminPage);
    gate.expectNoErrors();
  });

  test('More sheet opens and Escape closes it', async ({ adminPage }) => {
    const gate = await setupConsoleGate(adminPage);
    await adminPage.goto('/platform/dashboard');
    await adminPage.click('[data-testid="mobile-more-button"]');
    await expect(adminPage.locator('[data-testid="mobile-more-sheet"]')).toBeVisible();
    await adminPage.keyboard.press('Escape');
    await expect(adminPage.locator('[data-testid="mobile-more-sheet"]')).not.toBeVisible();
    gate.expectNoErrors();
  });

  test('desktop sidebar hidden on mobile', async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 390, height: 844 });
    await adminPage.goto('/platform/dashboard');
    await expect(adminPage.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
  });

  test('desktop sidebar visible on desktop', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await expect(adminPage.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
  });
});

test.describe('Role-Based Navigation', () => {
  test('admin can access email', async ({ adminPage }) => {
    const gate = await setupConsoleGate(adminPage);
    await adminPage.goto('/platform/email');
    await expect(adminPage).toHaveURL(/\/platform\/email/);
    gate.expectNoErrors();
  });

  test('worker cannot access email', async ({ workerPage }) => {
    await workerPage.goto('/platform/email');
    await expect(workerPage.getByText(/permission denied|access denied|forbidden/i)).toBeVisible();
  });

  test('manager cannot access email', async ({ managerPage }) => {
    await managerPage.goto('/platform/email');
    await expect(managerPage.getByText(/permission denied|access denied|forbidden/i)).toBeVisible();
  });

  test('worker sees timesheet in More sheet', async ({ workerPage }) => {
    await workerPage.goto('/platform/dashboard');
    await workerPage.click('[data-testid="mobile-more-button"]');
    await expect(workerPage.getByText(/Timesheet/i)).toBeVisible();
  });
});

test.describe('Quote Requests', () => {
  test('mobile cards visible on mobile', async ({ adminPage }) => {
    const gate = await setupConsoleGate(adminPage);
    await adminPage.setViewportSize({ width: 390, height: 844 });
    await adminPage.goto('/platform/quote-requests');
    await adminPage.waitForSelector('[data-testid="quote-request-mobile-list"]');
    const cards = adminPage.locator('[data-testid^="quote-request-card-"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await expectNoOverflow(adminPage);
    gate.expectNoErrors();
  });
});

test.describe('Business Email', () => {
  test('inbox loads without overflow', async ({ adminPage }) => {
    const gate = await setupConsoleGate(adminPage);
    await adminPage.goto('/platform/email');
    await adminPage.waitForTimeout(2000);
    await expect(adminPage).toHaveURL(/\/platform\/email/);
    await expectNoOverflow(adminPage);
    gate.expectNoErrors();
  });
});

test.describe('Email Center', () => {
  test('loads without overflow', async ({ adminPage }) => {
    const gate = await setupConsoleGate(adminPage);
    await adminPage.goto('/platform/email-center');
    await adminPage.waitForTimeout(1000);
    await expect(adminPage).toHaveURL(/\/platform\/email-center/);
    await expectNoOverflow(adminPage);
    gate.expectNoErrors();
  });
});

test.describe('Route Accessibility', () => {
  const ROUTES = [
    '/platform/dashboard',
    '/platform/projects',
    '/platform/quotes',
    '/platform/quote-requests',
    '/platform/email',
    '/platform/email-center',
    '/platform/settings',
  ];
  for (const route of ROUTES) {
    test(`${route} loads without page error`, async ({ adminPage }) => {
      const gate = await setupConsoleGate(adminPage);
      await adminPage.goto(route);
      await adminPage.waitForTimeout(1000);
      await expect(adminPage).toHaveURL(route);
      gate.expectNoErrors();
    });
  }
});
