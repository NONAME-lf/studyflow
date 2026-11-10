import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/**
 * e2e — scenarios E2E-01..03 (docs/stage4.md); screenshots — images for the report.
 * Needs PostgreSQL + Mailpit (docker compose up -d); api and web are started by `webServer`
 * unless they are already running. Screenshots expect fresh seed data (pnpm db:reset).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: '../../reports/data/e2e.json' }]],
  use: {
    baseURL,
    locale: 'uk-UA',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'e2e', testMatch: /.*\.e2e\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'screenshots',
      testMatch: /screenshots\.ts/,
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    command: 'pnpm --dir ../.. dev',
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
