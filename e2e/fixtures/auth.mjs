import { test as base, expect } from '@playwright/test';
import { testUsers } from '../support/testUsers.mjs';

export const test = base.extend({
  ownerPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUsers.owner.email);
    await page.fill('input[type="password"]', testUsers.owner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    await use(page);
  },
});
