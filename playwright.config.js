import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test-e2e',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(process.env.CI),
  /* Retry on CI only */
  retries: (process.env.CI != null) ? 2 : 0,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  // reporter: 'html', // Uncomment to generate HTML report
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3333',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    // 'allow' serviceWorkers is the default, but we want to be explicit
    serviceWorkers: 'allow',

    ignoreHTTPSErrors: true
  },

  globalSetup: './test-e2e/global-setup.ts',
  globalTeardown: './test-e2e/global-teardown.ts',

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ],
  webServer: [
    {
      command: 'node test-e2e/reverse-proxy.js',
      timeout: 5 * 1000,
      env: {
        BACKEND_PORT: '3000',
        PROXY_PORT: '3333'
      }
    },
    {
      // need to use built assets due to service worker loading issue.
      // TODO: figure out how to get things working with npm run start
      command: 'npm run build && npx http-server --silent -p 3000 dist',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI
    }
  ]
})
