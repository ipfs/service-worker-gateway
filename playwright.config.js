import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test-e2e',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  /* Run tests in files in parallel */
  fullyParallel: process.env.CI == null,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(process.env.CI),
  /* Retry on CI only */
  retries: (process.env.CI != null) ? 2 : 0,
  timeout: process.env.CI != null ? 120 * 1000 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  // reporter: 'html', // Uncomment to generate HTML report
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3333',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    // 'allow' serviceWorkers is the default, but we want to be explicit
    serviceWorkers: 'allow'
  },

  globalSetup: './test-e2e/global-setup.ts',
  globalTeardown: './test-e2e/global-teardown.ts',

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }

    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox']
      }
    },
    /**
     * Test a deployed site such as inbrowser.dev with `BASE_URL="https://inbrowser.dev" npm run test:deployed`
     * or inbrowser.link with `BASE_URL="https://inbrowser.link" npm run test:deployed`
     */
    {
      name: 'deployed',
      use: {
        ...devices['Desktop Chrome'],
        ...devices['Desktop Firefox'],
        baseURL: process.env.BASE_URL
      }
    },
    {
      /**
       * Test the site with service workers disabled. You need to `import {testNoServiceWorker as test, expect} from './fixtures/config-test-fixtures.js'` to use this project.
       * Anything needing a service worker will be skipped when this project is ran.
       */
      name: 'no-service-worker',
      testMatch: /test-e2e\/no-service-worker\.test\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        contextOptions: {
          serviceWorkers: 'block'
        },
        launchOptions: {
          firefoxUserPrefs: {
            'dom.serviceWorkers.enabled': false
          }
        },
        beforeEach: async ({ page }) => {
          await page.addInitScript(() => {
            Object.defineProperty(navigator, 'serviceWorker', {
              get: () => undefined
            })
          })
        }
      }
    }
  ],
  // TODO: disable webservers when testing `deployed` project
  webServer: [
    {
      // need to use built assets due to service worker loading issue.
      command: process.env.SHOULD_BUILD !== 'false' ? 'npm run build && npx http-server --silent -p 3000 dist' : 'npx http-server --silent -p 3000 dist',
      port: 3000,
      timeout: 60 * 1000,
      reuseExistingServer: false,
      stdout: process.env.CI ? undefined : 'pipe',
      stderr: process.env.CI ? undefined : 'pipe'
    }
  ]
})
