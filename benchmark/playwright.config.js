import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.test.ts',

  // Very long timeout to run the conformance suite
  timeout: 640_000_000,

  // no retries
  retries: 0,

  // Reporter to use. See https://playwright.dev/docs/test-reporters
  // reporter: 'html', // Uncomment to generate HTML report
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: `http://localhost:3000`,

    // Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
    trace: 'on-first-retry',

    // 'allow' serviceWorkers is the default, but we want to be explicit
    serviceWorkers: 'allow'
  },

  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome']
    }
  }]
})
