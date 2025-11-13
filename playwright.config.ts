import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Run tests serially for now to avoid intermittent dev-middleware race conditions
  workers: 1,
  testDir: 'e2e',
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    port: 5173,
    reuseExistingServer: true,
    env: {
      // Prevent MSW service worker registration during Playwright runs
      VITE_DISABLE_MSW: 'true',
    },
    timeout: 120000,
  },
});
