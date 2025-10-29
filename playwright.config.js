import { defineConfig, devices } from '@playwright/test'

function getWebServerCommand () {
  if (process.env.BASE_URL != null) {
    // we need to make sure the webserver doesn't exit before the tests are done, but we don't want to build or serve if the BASE_URL is set
    return `
    echo "BASE_URL is set to ${process.env.BASE_URL}, skipping http-server setup"
    while true; do
      sleep 100
    done
    `
  }

  const serveCommand = 'npx http-server --silent -p 3000 dist'
  if (process.env.SHOULD_BUILD !== 'false') {
    return `npm run build && ${serveCommand}`
  }
  return serveCommand
}

export default defineConfig({
  testDir: './test-e2e',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  /* Run tests in files in parallel */
  fullyParallel: process.env.CI == null,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(process.env.CI),
  /* Retry on CI only */
  retries: (process.env.CI != null) ? 2 : 0,
  timeout: process.env.CI != null ? 30 * 1000 : undefined,

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
    {
      // NOTE: github CI isn't running these tests successfully, but they work locally.
      name: 'safari',
      use: {
        ...devices['Desktop Safari']
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
        /**
         *
         * @param {object} param0
         * @param {import('@playwright/test').Page} param0.page
         */
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

  webServer: [
    {
      // need to use built assets due to service worker loading issue.
      command: getWebServerCommand(),
      port: process.env.BASE_URL != null ? undefined : 3000,
      timeout: 60 * 1000,
      reuseExistingServer: false,
      stdout: process.env.CI ? undefined : 'pipe',
      stderr: process.env.CI ? undefined : 'pipe'
    }
  ]
})
