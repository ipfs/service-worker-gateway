import type { Page } from 'playwright'

export async function hasCacheEntry (page: Page, cacheName: string, key: string): Promise<boolean> {
  return page.evaluate(async ({ cacheName, key }) => {
    const cacheKeys = await caches.keys()
    const cacheKey = cacheKeys.find(k => k.startsWith(cacheName))

    if (cacheKey == null) {
      return false
    }

    const cache = await caches.open(cacheKey)

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
