import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Integration tests run against the real PostgreSQL test database (DATABASE_URL_TEST).
if (existsSync('.env')) process.loadEnvFile('.env');
const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) throw new Error('DATABASE_URL_TEST is not set (see apps/api/.env.example)');

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.int-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Same scope as the unit-test coverage (vitest.config.ts), so the numbers are comparable.
      exclude: [
        'src/generated/**',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/main.ts',
        'src/openapi-export.ts',
      ],
    },
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'test-access-secret',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret',
      REMINDER_CRON: 'off',
    },
  },
});
