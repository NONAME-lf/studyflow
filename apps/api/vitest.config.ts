import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/main.ts',
        'src/openapi-export.ts',
      ],
      reporter: ['text', 'json-summary'],
    },
  },
});
