import { defineConfig, devices } from '@playwright/test';

// Each test starts its own Turbodrop binary (see tests/host.ts), so nothing to boot here.
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'iphone-safari', use: { ...devices['iPhone 15'] } },
    { name: 'android-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
});
