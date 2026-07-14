import { expect } from '@playwright/test';

export async function setupConsoleGate(page) {
  const errors = [];

  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', message: err.message });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', message: msg.text() });
    }
  });

  return {
    expectNoErrors: () => {
      expect(errors).toEqual([]);
    },
  };
}
