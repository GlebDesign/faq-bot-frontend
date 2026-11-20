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
      env: { VITE_AUTH_MODE: 'real', VITE_AGENTS_MODE: 'mock', VITE_API_URL: '/api' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run mock:api',
      url: 'http://127.0.0.1:5185/health',
      env: {
        MOCK_API_PORT: '5185',
        MOCK_AUTH_ORIGIN: 'http://127.0.0.1:5177',
        MOCK_API_EPHEMERAL: '1',
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5177 --strictPort',
      url: 'http://127.0.0.1:5177',
      env: {
        VITE_AUTH_MODE: 'real',
        VITE_AGENTS_MODE: 'real',
        API_PROXY_TARGET: 'http://127.0.0.1:5185',
        VITE_MOCK_API: 'true',
        VITE_API_URL: '/api',
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
