const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
 testDir: './e2e', workers: 1, fullyParallel: false, timeout: 120000,
 use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  channel: 'chrome', headless: true, viewport: { width: 1440, height: 1100 },
  screenshot: 'only-on-failure', trace: 'retain-on-failure' },
 reporter: 'list',
});
