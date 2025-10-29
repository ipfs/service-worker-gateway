// see https://github.com/ipfs/service-worker-gateway/issues/502
import { testSubdomainRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

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
    expect(text).toContain('504 Gateway Timeout')
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

  test('service worker unregisters automatically when ttl expires', async ({ page, baseURL, protocol, rootDomain, swResponses }) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page, baseURL)
    // set the ttl in milliseconds
    await setConfig({ page, config: { serviceWorkerRegistrationTTL: 1400 } })

    await page.goto(`${protocol}//bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui.ipfs.${rootDomain}/root2/root3/root4/`, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page, baseURL)
    expect(swResponses.length).toBe(1)
    const response = swResponses[swResponses.length - 1]
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('text/html; charset=utf-8')
    expect(await response?.text()).toContain('hello')

    // wait for the ttl to expire
    await page.waitForTimeout(1500)

    const response2 = await page.reload({ waitUntil: 'networkidle' })
    expect(swResponses.length).toBe(2)
    expect(response2?.status()).toBe(200)
    expect(response2?.headers()['content-type']).toBe('text/html; charset=utf-8')
    expect(await response2?.text()).toContain('hello')

    // wait for the TTL invalid setTimeout to run.
    await page.waitForTimeout(100)

    const noServiceWorkerRegistration = await page.evaluate(async () => {
      return await window.navigator.serviceWorker.getRegistration() === undefined
    })

    expect(noServiceWorkerRegistration).toBe(true)
  })
})
