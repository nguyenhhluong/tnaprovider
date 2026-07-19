import { test as base } from '@playwright/test';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for authenticated E2E tests. Set it in CI secrets or .env file.`);
  }
  return value;
}

function getTestUser(role) {
  const key = role.toUpperCase();
  return {
    email: requiredEnv(`E2E_${key}_EMAIL`),
    password: requiredEnv(`E2E_${key}_PASSWORD`),
  };
}

async function loginAs(page, role) {
  const { email, password } = getTestUser(role);
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);
  // Verify the correct role via API call
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    return data.user ? data.user.role : null;
  });
  if (response !== role) {
    throw new Error(`Expected role "${role}" but got "${response}"`);
  }
}

export const test = base.extend({
  ownerPage: async ({ page }, use) => { await loginAs(page, 'owner'); await use(page); },
  adminPage: async ({ page }, use) => { await loginAs(page, 'admin'); await use(page); },
  managerPage: async ({ page }, use) => { await loginAs(page, 'manager'); await use(page); },
  workerPage: async ({ page }, use) => { await loginAs(page, 'worker'); await use(page); },
  clientPage: async ({ page }, use) => { await loginAs(page, 'client'); await use(page); },
});
