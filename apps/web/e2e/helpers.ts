import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Secret123!';

export const uniqueId = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

/** Local yyyy-MM-dd (the browser and the test run on the same machine). */
export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Opens a page and waits until React has hydrated it (no pending requests). */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

export async function registerViaUi(page: Page, fullName: string, email: string): Promise<void> {
  await open(page, '/register');
  await page.getByTestId('register-name').fill(fullName);
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(PASSWORD);
  await page.getByTestId('register-confirm').fill(PASSWORD);
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function loginViaUi(page: Page, email: string, password = PASSWORD): Promise<void> {
  await open(page, '/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}
