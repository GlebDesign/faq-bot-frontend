import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5175',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -- --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175',
      env: { VITE_AUTH_MODE: 'mock' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5176 --strictPort',
      url: 'http://127.0.0.1:5176',
      env: { VITE_AUTH_MODE: 'real' },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
