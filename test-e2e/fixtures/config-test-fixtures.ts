import { test as base } from '@playwright/test'
import type { Page, TestFixture } from '@playwright/test'

interface TestOptions {
  /**
   * The protocol used by the page, e.g. 'http:'
   */
  protocol: string

  /**
   * The host and port used by the page, e.g. 'localhost:3334'
   */
  host: string

  /**
   * The port used by the webserver, e.g. 3334
   */
  port: number

  /**
   * The host used by the page, e.g. 'localhost'
   */
  hostname: string

  /**
   * The base url, e.g. 'http://localhost:3334'
   */
  baseURL: string

  /**
   * The page object
   */
  page: Page
}

// from playwright types, but not exported.
type TestFixtureValue<R, Args extends {}> = Exclude<R, Function> | TestFixture<R, Args>

function isNoServiceWorkerProject <T extends typeof base = typeof base> (test: T): boolean {
  return test.info().project.name === 'no-service-worker'
}

const host: TestFixtureValue<TestOptions['host'], TestOptions> = async ({ baseURL }, use): Promise<void> => {
  const url = new URL(baseURL)
  await use(url.host)
}

const hostname: TestFixtureValue<TestOptions['hostname'], TestOptions> = async ({ baseURL }, use): Promise<void> => {
  const url = new URL(baseURL)
  await use(url.hostname)
}

const port: TestFixtureValue<TestOptions['port'], TestOptions> = async ({ baseURL }, use): Promise<void> => {
  const url = new URL(baseURL)
  await use(url.port === '' ? 80 : parseInt(url.port))
}

const protocol: TestFixtureValue<TestOptions['protocol'], TestOptions> = async ({ baseURL }, use): Promise<void> => {
  const url = new URL(baseURL)
  await use(url.protocol)
}

export const test = base.extend<TestOptions>({
  protocol: [protocol, { scope: 'test' }],
  host: [host, { scope: 'test' }],
  hostname: [hostname, { scope: 'test' }],
  port: [port, { scope: 'test' }],
  page: async ({ page, baseURL }, use: (value: Page) => Promise<void>): Promise<void> => {
    if (isNoServiceWorkerProject(test)) {
      test.skip()
      return
    }

    await page.goto(baseURL, {
      waitUntil: 'networkidle'
    })

    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      const isNotLocalQuery = !url.host.includes('localhost') && !url.host.includes('127.0.0.1')
      let isBaseUrl = false

      if (process.env.BASE_URL != null) {
        const baseUrl = new URL(process.env.BASE_URL)
        isBaseUrl = url.host.includes(baseUrl.host)
      }

      if (isNotLocalQuery && !isBaseUrl) {
        await route.abort()
      } else {
        await route.continue()
      }
    })

    await use(page)
  }
})

/**
 * A fixture that skips tests that require the service worker. This is needed in
 * order to test handling of requests where the service worker is not present.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/272
 */
export const testNoServiceWorker = base.extend<Omit<TestOptions, 'swResponses'>>({
  protocol: [protocol, { scope: 'test' }],
  host: [host, { scope: 'test' }],
  hostname: [hostname, { scope: 'test' }],
  port: [port, { scope: 'test' }],
  page: async ({ page }, use) => {
    if (!isNoServiceWorkerProject(testNoServiceWorker)) {
      testNoServiceWorker.skip()
      return
    }

    await use(page)
  }
})

export { expect } from '@playwright/test'
