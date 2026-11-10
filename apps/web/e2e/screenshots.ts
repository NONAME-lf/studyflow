import { execSync } from 'node:child_process';
import { expect, type Page, test } from '@playwright/test';
import { loginViaUi, open } from './helpers';

/**
 * Images for the report and the slides → reports/img/*.png (`pnpm screenshots`).
 * Re-seeds the demo data first, so dates and progress are the same as in the live demo.
 */
const OUT = '../../reports/img';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

const shot = (page: Page, name: string) => page.screenshot({ path: `${OUT}/${name}.png` });

test.beforeAll(() => {
  execSync('pnpm --filter @studyflow/api db:seed', { cwd: '../..', stdio: 'inherit' });
});

test('report screenshots', async ({ page, request }) => {
  test.setTimeout(120_000);

  await open(page, '/login');
  await shot(page, 'login');

  await loginViaUi(page, 'starosta@studyflow.dev', 'Demo1234!');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByTestId('deadline-row').first().waitFor();
  await page.waitForLoadState('networkidle');
  await shot(page, 'dashboard');

  await page.getByTestId('nav-calendar').click();
  await page.getByTestId('calendar-week').waitFor();
  await page.waitForLoadState('networkidle');
  await shot(page, 'calendar-week');
  await page.getByTestId('view-month').click();
  await page.getByTestId('calendar-month').waitFor();
  await page.waitForLoadState('networkidle');
  await shot(page, 'calendar-month');

  await page.getByTestId('nav-groups').click();
  await page.getByTestId('group-card').filter({ hasText: 'МІ-41' }).click();
  await page.getByTestId('invite-code').waitFor();
  await page.getByTestId('deadline-row').first().waitFor();
  await page.waitForLoadState('networkidle');
  await shot(page, 'group');

  await page.getByTestId('open-board').click();
  await page.getByTestId('task-card').first().waitFor();
  await page.waitForLoadState('networkidle');
  await shot(page, 'board');

  await page.goto(`${API_URL}/api/docs`);
  await page.locator('.swagger-ui .opblock').first().waitFor();
  await shot(page, 'swagger');

  // A reminder letter: clean Mailpit, run the reminders job, open the starosta's letter.
  await request.delete(`${MAILPIT_URL}/api/v1/messages`);
  const run = await request.post('/api/dev/reminders/run');
  expect(run.ok()).toBe(true);
  const query = 'to:starosta@studyflow.dev';
  const search = await request.get(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(query)}`,
  );
  const { messages } = (await search.json()) as { messages: { ID: string }[] };
  expect(messages.length).toBeGreaterThan(0);
  // Through the search page, so the inbox list shows only the demo user's letters.
  await page.goto(`${MAILPIT_URL}/search?q=${encodeURIComponent(query)}`);
  await page.locator(`a[href*="${messages[0].ID}"]`).first().click();
  await page.waitForLoadState('networkidle');
  await shot(page, 'mailpit');
});
