import { test as base } from '@playwright/test';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for authenticated E2E tests`);
  return value;
}

function createLoginFixture(role) {
  const key = role.toUpperCase();
  return async ({ page }, use) => {
    const email = process.env[`E2E_${key}_EMAIL`] || `e2e-${role}@test.com`;
    const password = process.env[`E2E_${key}_PASSWORD`] || 'TestPass123!';
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    await use(page);
  };
}

export const test = base.extend({
  ownerPage: createLoginFixture('owner'),
  adminPage: createLoginFixture('admin'),
  managerPage: createLoginFixture('manager'),
  workerPage: createLoginFixture('worker'),
  clientPage: createLoginFixture('client'),
});
