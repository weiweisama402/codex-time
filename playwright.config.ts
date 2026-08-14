import { defineConfig, devices } from '@playwright/test';

const projects = process.env.CI
  ? [
      { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
      { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } }
    ]
  : [
      { name: 'mobile-chrome', use: { ...devices['Pixel 7'], channel: 'chrome' } },
      { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
      { name: 'desktop-edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } }
    ];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 3,
  timeout: 20000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects
});
