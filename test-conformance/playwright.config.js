import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

/**
 * Static asset server that serves the service worker gateway resources from the
 * dist folder
 */
const HTTP_PORT = 3000

export default defineConfig({
  testDir: '.',
  testMatch: 'conformance.test.ts',
  // Very long timeout to run the conformance suite
  timeout: 640_000_000,
  // disable parallelism
  workers: 1,
  // no retries
  retries: 0,

  globalSetup: './fixtures/global-setup.ts',
  globalTeardown: './fixtures/global-teardown.ts',

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  // reporter: 'html', // Uncomment to generate HTML report
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://localhost:${HTTP_PORT}`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    // 'allow' serviceWorkers is the default, but we want to be explicit
    serviceWorkers: 'allow'
  },

  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome']
    }
  }, {
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
      launchOptions: {
        firefoxUserPrefs: {
          // if we redirect too quickly, too many times, Firefox deletes all
          // site application data (e.g. the service worker)
          'privacy.bounceTrackingProtection.mode': 0
        }
      }
    }
  }, {
    // NOTE: github CI isn't running these tests successfully, but they work locally.
    name: 'safari',
    use: {
      ...devices['Desktop Safari']
    }

  }],

  webServer: [{
    // the --proxy arg implements the catch-all redirect needed for the path
    // gateway support
    command: `npx http-server --silent -p ${HTTP_PORT} ${resolve(fileURLToPath(import.meta.url), '../../dist')} --proxy http://localhost:${HTTP_PORT}?`,
    port: HTTP_PORT,
    timeout: 60 * 1000,
    reuseExistingServer: false,
    stdout: process.env.CI ? undefined : 'pipe',
    stderr: process.env.CI ? undefined : 'pipe'
  }]
})
