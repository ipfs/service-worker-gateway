import type { Page } from 'playwright'

export async function hasCacheEntry (page: Page, cacheName: string, key: string): Promise<boolean> {
  return page.evaluate(async ({ cacheName, key }) => {
    const cache = await caches.open(cacheName)

    for (const req of await cache.keys()) {
      if (req.url.includes(key)) {
        return true
      }
    }

    return false
  }, {
    cacheName,
    key
  })
}
