import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser', workers: 1, timeout: 90000, expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:8093', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
  webServer: { command: 'PORT=8093 HOST=127.0.0.1 HOUSE_DB_PATH=test-results/browser.db npm start', url: 'http://127.0.0.1:8093/healthz', reuseExistingServer: false, timeout: 30000 },
});
