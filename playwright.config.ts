import { defineConfig, devices } from '@playwright/test';

const mobile360 = { ...devices['Pixel 5'], viewport: { width: 360, height: 800 } };
const mobile412 = { ...devices['Pixel 7'], viewport: { width: 412, height: 915 } };
const projects = process.env.CI
  ? [
      { name: 'android-chrome-360', use: mobile360 },
      { name: 'android-edge-412', use: mobile412 }
    ]
  : [
      { name: 'android-chrome-360', use: { ...mobile360, channel: 'chrome' } },
      { name: 'android-edge-412', use: { ...mobile412, channel: 'msedge' } }
    ];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 2,
  timeout: 30000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects
});
