// see https://github.com/ipfs/service-worker-gateway/issues/502
import { test as testOriginal } from '@playwright/test'
import { testSubdomainRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'
import type { Page } from '@playwright/test'

test.describe('smoke test', () => {
  test('loads a dag-json jpeg', async ({ page, protocol, swResponses, rootDomain }) => {
    await page.goto(`${protocol}//${rootDomain}/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`)

    await page.waitForURL(`http://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.${rootDomain}`)
    await page.waitForLoadState('networkidle')

    const response = swResponses[swResponses.length - 1]

    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('image/jpeg')
  })

  test('request to /ipfs/dir-cid redirects to /ipfs/dir-cid/', async ({ page, protocol, swResponses, rootDomain }) => {
    await page.goto(`${protocol}//${rootDomain}/ipfs/bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui/root2/root3/root4`)
    await page.waitForURL(`${protocol}//bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui.ipfs.${rootDomain}/root2/root3/root4/`)
    await page.waitForLoadState('networkidle')
    const response = swResponses[swResponses.length - 1]
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('text/html; charset=utf-8')
    expect(await response?.text()).toContain('hello')
  })

  /**
   * TODO: address issues mentioned in https://github.com/ipfs/helia-verified-fetch/issues/208
   */
  test('request to /ipfs/dir-cid without index.html returns dir listing', async ({ page, protocol, swResponses, rootDomain }) => {
    await page.goto(`${protocol}//${rootDomain}/ipfs/bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui/root2/root3`)
    await page.waitForURL(`${protocol}//bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui.ipfs.${rootDomain}/root2/root3/`)
    await page.waitForLoadState('networkidle')
    const response = swResponses[swResponses.length - 1]
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('text/html')
    // there should be a dir listing that has the CID of the root3 node, and the name of the root4 node with a short name

    const header = await page.waitForSelector('main header')
    expect(await header?.innerText()).toContain('Index of root3')
    const headerCid = await header.$('.ipfs-hash')
    expect(await headerCid?.innerText()).toContain('bafybeiawdvhmjcz65x5egzx4iukxc72hg4woks6v6fvgyupiyt3oczk5ja')

    // .grid.dir will have a list of rows (1 in this case) with links to the files in the directory. One link where the name is, and one link with a short hash (.ipfs-hash)
    const gridDir = await page.waitForSelector('.grid.dir')
    const rowCells = await gridDir?.$$('> div') // ideally we would have a better selector for each row, but there is currently no wrapping element for each row
    expect(rowCells?.length).toBe(4)
    const nameLink = await rowCells[1].$('a')
    const shortHashLink = await rowCells[2].$('a')
    expect(await nameLink?.innerText()).toBe('root4')
    expect(await nameLink?.getAttribute('href')).toBe('root4')
    expect(await shortHashLink?.innerText()).toContain('bafy...lo7q')
    expect(await shortHashLink?.getAttribute('href')).toContain(`http://${rootDomain}/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q?filename=root4`)
  })

  /**
   * @see https://github.com/ipfs/service-worker-gateway/issues/662
   * TODO: re-enable when github CI is fixed..
   */
  test('request to /ipns/<libp2p-key> returns expected content', async ({ page, protocol, rootDomain }) => {
    await page.goto(`${protocol}//${rootDomain}/ipns/k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam`)
    // then validate that the service worker gateway returns the same content
    await page.waitForURL(`http://k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam.ipns.${rootDomain}`)
    await page.waitForLoadState('networkidle')

    await page.waitForFunction(async () => document.body.textContent?.includes('hello'), { timeout: 10000 })
  })

  test('configurable timeout value is respected', async ({ page, protocol, rootDomain, swResponses }) => {
    await page.goto(`${protocol}//${rootDomain}`)
    await waitForServiceWorker(page, `${protocol}//${rootDomain}`)
    await setConfig({ page, config: { fetchTimeout: 5 } })

    const response504 = page.waitForResponse(async (response) => {
      const url = new URL(response.url())
      return url.host === `bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze.ipfs.${rootDomain}` && url.pathname.includes('/wiki/Antarctica') && response.status() === 504
    })
    await page.goto(`${protocol}//${rootDomain}/ipfs/bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze/wiki/Antarctica`)
    await response504

    const response = swResponses[swResponses.length - 1]
    expect(response?.status()).toBe(504)
    const text = await response?.text()
    expect(text).toContain('504 Gateway timeout')
    expect(text).toContain('Increase the timeout in the')

    // re-set the timeout to 30 seconds
    await page.goto(`${protocol}//${rootDomain}`)
    await setConfig({ page, config: { fetchTimeout: 30 } })
  })

  test('unregistering the service worker works', async ({ page, baseURL }) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page, baseURL)

    // unregister the service worker and make sure the config is empty
    await page.click('#unregister-sw')
    await page.waitForLoadState('networkidle')

    const noRegistration = await page.evaluate(async () => {
      return await window.navigator.serviceWorker.getRegistration() === undefined
    })

    expect(noRegistration).toBe(true)
  })
})

function waitForAllNavigations (page: Page, additionalUrlPartsToWaitFor: Record<string, boolean> = {}): Promise<void> {
  // we need to make sure we go through the redirect bounce, and we need to not be tied strictly to playwrights delays and oddities.
  // we should have a list of things to look for in urls, and resolve this promise only when all of them have been seen.

  const urlPartsToWaitFor = {
    'helia-sw=': false,
    'ipfs-sw-subdomain-request=': false,
    'ipfs-sw-cfg': false,
  }

  return new Promise((resolve) => {
    page.on('response', (response) => {
      const url = new URL(response.url())
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [key, _value] of Object.entries(urlPartsToWaitFor)) {
        if (url.href.includes(key)) {
          urlPartsToWaitFor[key] = true
        }
      }
      if (Object.values(urlPartsToWaitFor).every(value => value === true)) {
        if (Object.keys(additionalUrlPartsToWaitFor).length === 0) {
          resolve()
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [key, _value] of Object.entries(additionalUrlPartsToWaitFor)) {
          if (url.href.includes(key)) {
            additionalUrlPartsToWaitFor[key] = true
          }
        }
        if (Object.values(additionalUrlPartsToWaitFor).every(value => value === true)) {
          resolve()
        }
      }
    })
  })
}

testOriginal('timing of initial page content', async ({ page }) => {
  const protocol = 'http:'
  const rootDomain = 'localhost:3000'
  const startTime = Date.now()
  const vitalikCid = 'bafybeihjkbvr6xzqiacmazxq4fgmhhni7gaho7hnpkavnksjxiyxqdrbsu'
  const waitForRedirectBounce = waitForAllNavigations(page, { '/general/2025/05/11/abc4.html': false })
  await page.goto(`${protocol}//${vitalikCid}.ipfs.${rootDomain}/general/2025/05/11/abc4.html`)
  // await page.waitForLoadState('networkidle')
  // expect(response?.headers()['location']).toContain('helia-sw=')
  // await page.waitForURL((url) => url.href.includes('helia-sw='))

  await waitForRedirectBounce
  await page.waitForURL(`${protocol}//${vitalikCid}.ipfs.${rootDomain}/general/2025/05/11/abc4.html`)
  // expect(page.url()).toContain(`${protocol}//${vitalikCid}.ipfs.${rootDomain}/general/2025/05/11/abc4.html`)
  const endTime = Date.now()
  const duration = endTime - startTime
  // eslint-disable-next-line no-console
  console.log(`time: ${duration}ms to wait for the service worker to render the content`)

  // wait for the text "You may have at some point seen this math puzzle:"
  // await page.waitForFunction(() => document.body.textContent?.includes('You may have at some point seen this math puzzle:'), { timeout: 10000 })
  // await page.waitForSelector('title=A simple explanation of a/(b+c) + b/(c+a) + c/(a+b) = 4')
  await page.waitForSelector('text=You may have at some point seen this math puzzle:')
  await expect(page).toHaveTitle('A simple explanation of a/(b+c) + b/(c+a) + c/(a+b) = 4')

  const endTime2 = Date.now()
  const duration2 = endTime2 - startTime
  // eslint-disable-next-line no-console
  console.log(`time: ${duration2}ms to wait for the content to be rendered`)

  const largestContentfulPaint = await page.evaluate(() => {
    return new Promise<number | null>((resolve) => {
      const po = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1] as any
        resolve(last.renderTime ?? last.loadTime)
        po.disconnect()
      })
      po.observe({ type: 'largest-contentful-paint', buffered: true })
      // if nothing fires in the next tick, resolve null
      setTimeout(() => {
        po.disconnect()
        resolve(null)
      }, 0)
    })
  })

  // eslint-disable-next-line no-console
  console.log(`time: ${largestContentfulPaint}ms LCP`)
})
