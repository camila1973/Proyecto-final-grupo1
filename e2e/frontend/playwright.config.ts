import { defineConfig, devices } from '@playwright/test';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL ?? 'http://localhost:4200';
const isLocal = FRONTEND_BASE_URL.startsWith('http://localhost');

export default defineConfig({
  testDir: './src/tests',
  // Traveller specs share the seeded booking property/room. Run them serially
  // for now so concurrent holds on the same room don't race on the seed window.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../../playwright-report/frontend', open: 'never' }],
  ],
  use: {
    baseURL: FRONTEND_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: '../../test-results/frontend',
  // Only auto-start the Vite dev server when pointing at localhost; when
  // FRONTEND_BASE_URL is a deployed URL the host is already serving the app.
  webServer: isLocal
    ? {
        command: 'pnpm exec nx serve frontend',
        url: FRONTEND_BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : undefined,
});
