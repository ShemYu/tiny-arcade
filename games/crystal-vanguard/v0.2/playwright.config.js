import { defineConfig } from '@playwright/test';

const externalChromium = process.env.CV_CHROMIUM_PATH;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list']],
  outputDir: './test-results',
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory ../../..',
    url: 'http://127.0.0.1:4173/games/crystal-vanguard/v0.2/',
    reuseExistingServer: true,
    timeout: 10_000
  },
  use: {
    baseURL: 'http://127.0.0.1:4173/games/crystal-vanguard/v0.2/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: externalChromium ? {
      executablePath: externalChromium,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--single-process',
        '--no-zygote',
        '--disable-webgl'
      ]
    } : {}
  },
  projects: [
    {
      name: 'iphone-minimum',
      testMatch: /mobile-shell\.spec\.js/,
      use: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'iphone-toolbar-open',
      testMatch: /mobile-shell\.spec\.js/,
      use: { viewport: { width: 390, height: 650 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'iphone-compact',
      testMatch: /mobile-shell\.spec\.js/,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'iphone-current',
      testMatch: /mobile-shell\.spec\.js/,
      use: { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'iphone-large',
      testMatch: /mobile-shell\.spec\.js/,
      use: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'iphone-landscape',
      testMatch: /mobile-shell\.spec\.js/,
      use: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'desktop',
      testMatch: /mobile-shell\.spec\.js/,
      use: { viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'asset-lab-390',
      testMatch: /blade-asset-lab\.spec\.js/,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'asset-lab-430',
      testMatch: /blade-asset-lab\.spec\.js/,
      use: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'seed-review-390',
      testMatch: /blade-seed-review\.spec\.js/,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    },
    {
      name: 'seed-review-430',
      testMatch: /blade-seed-review\.spec\.js/,
      use: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true }
    }
  ]
});
