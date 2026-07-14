import { test, expect } from './fixtures/auth.mjs';

async function expectNoOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

const BREAKPOINTS = [320, 360, 390, 430, 768];
const ROUTES = [
  '/platform/dashboard',
  '/platform/projects',
  '/platform/quotes',
  '/platform/quote-requests',
  '/platform/users',
  '/platform/tasks',
  '/platform/documents',
  '/platform/reports',
  '/platform/email',
  '/platform/email-center',
  '/platform/settings',
];

for (const width of BREAKPOINTS) {
  for (const route of ROUTES) {
    test(`${route} has no overflow at ${width}px`, async ({ adminPage }) => {
      await adminPage.setViewportSize({ width, height: 844 });
      await adminPage.goto(route);
      await adminPage.waitForTimeout(1500);
      await expectNoOverflow(adminPage);
    });
  }
}
