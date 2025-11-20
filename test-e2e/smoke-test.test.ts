import { peerIdFromString } from '@libp2p/peer-id'
import { base16 } from 'multiformats/bases/base16'
import { CID } from 'multiformats/cid'
import { CURRENT_CACHES } from '../src/constants.js'
import { HASH_FRAGMENTS } from '../src/lib/constants.js'
import { testSubdomainRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { hasCacheEntry } from './fixtures/has-cache-entry.js'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('smoke test', () => {
  test('loads a jpeg', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

    await loadWithServiceWorker(page, `${protocol}//${rootDomain}/`)

    // should not be cached
    expect(await hasCacheEntry(page, CURRENT_CACHES.mutable, cid)).toBeFalsy()
    expect(await hasCacheEntry(page, CURRENT_CACHES.immutable, cid)).toBeFalsy()

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}`, {
      redirect: `${protocol}//${cid}.ipfs.${rootDomain}/`
    })
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('image/jpeg')
    expect(response?.headers()['cache-control']).toBe('public, max-age=29030400, immutable')

    // should be in the immutable cache
    expect(await hasCacheEntry(page, CURRENT_CACHES.mutable, cid)).toBeFalsy()
    expect(await hasCacheEntry(page, CURRENT_CACHES.immutable, cid)).toBeTruthy()
  })

  test('request to /ipfs/dir-cid redirects to /ipfs/dir-cid/', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui'
    const path = 'root2/root3/root4'
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}/${path}`, {
      redirect: `${protocol}//${cid}.ipfs.${rootDomain}/${path}/`
    })

    // should have added trailing slash for directory
    expect(response.url()).toBe(`${protocol}//${cid}.ipfs.${rootDomain}/${path}/`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('text/html; charset=utf-8')
    expect(await response.text()).toContain('hello')
  })

  /**
   * TODO: address issues mentioned in https://github.com/ipfs/helia-verified-fetch/issues/208
   */
  test('request to /ipfs/dir-cid without index.html returns dir listing', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui'
    const path = 'root2/root3'
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}/${path}`, {
      redirect: `${protocol}//${cid}.ipfs.${rootDomain}/${path}/`
    })
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('text/html')

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

  test('request to /ipns/<libp2p-key> returns expected content', async ({ page, protocol, rootDomain }) => {
    const key = 'k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam'

    // should not be cached
    expect(await hasCacheEntry(page, CURRENT_CACHES.mutable, key)).toBeFalsy()
    expect(await hasCacheEntry(page, CURRENT_CACHES.immutable, key)).toBeFalsy()

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipns/${key}`, {
      redirect: `${protocol}//${key}.ipns.${rootDomain}/`
    })
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello')

    // should be in the mutable cache only
    expect(await hasCacheEntry(page, CURRENT_CACHES.mutable, key)).toBeTruthy()
    expect(await hasCacheEntry(page, CURRENT_CACHES.immutable, key)).toBeFalsy()
  })

  test('configurable timeout value is respected', async ({ page, protocol, rootDomain, swResponses }) => {
    await page.goto(`${protocol}//${rootDomain}`)
    await waitForServiceWorker(page)
    await setConfig(page, {
      fetchTimeout: 5
    })

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
    await page.goto(`${baseURL}/#${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`, {
      waitUntil: 'networkidle'
    })
    await waitForServiceWorker(page)

    // unregister the service worker and make sure the config is empty
    await page.click('#unregister-sw')
    await page.waitForLoadState('networkidle')

    const noRegistration = await page.evaluate(async () => {
      return await window.navigator.serviceWorker.getRegistration() === undefined
    })

    expect(noRegistration).toBe(true)
  })

  test('service worker un-registers automatically when ttl expires', async ({ page, baseURL, protocol, rootDomain }) => {
    await page.goto(baseURL, {
      waitUntil: 'networkidle'
    })
    await waitForServiceWorker(page)

    // set the ttl in milliseconds
    await setConfig(page, {
      serviceWorkerRegistrationTTL: 1400
    })

    const cid = 'bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui'
    const path = 'root2/root3/root4'
    const response = await loadWithServiceWorker(page, `${protocol}//${cid}.ipfs.${rootDomain}/${path}/`, {
      redirect: `${protocol}//${cid}.ipfs.${rootDomain}/${path}/`
    })
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('text/html; charset=utf-8')
    expect(await response?.text()).toContain('hello')

    // wait for the ttl to expire
    await page.waitForTimeout(1500)

    const response2 = await page.reload({
      waitUntil: 'networkidle'
    })
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

  test('normalizes base16 CIDs to base32', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafkqablimvwgy3y'
    const asBase16 = CID.parse(cid).toString(base16)

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${asBase16}`, {
      redirect: `${protocol}//${cid}.ipfs.${rootDomain}/`
    })
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello')
  })

  test('normalizes base16 IPNS names to base36', async ({ page, protocol, rootDomain }) => {
    const key = 'k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam'
    const asBase16 = peerIdFromString(key).toCID().toString(base16)

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipns/${asBase16}`, {
      redirect: `${protocol}//${key}.ipns.${rootDomain}/`
    })
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello')
  })

  test('errors on invalid CIDs', async ({ page, protocol, rootDomain }) => {
    const cid = '!bafkqablimvwgy3y'

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}`)
    expect(response.status()).toBe(400)
    expect(await response.text()).toContain('Could not parse CID')
  })

  test('supports truncated CID hashes', async ({ page, protocol, rootDomain }) => {
    // this is sha2-512-half
    const cid = CID.parse('bafkrgihhyivzstcz3hhswshfjgy6ertgmnqeleynhwt4dlfsthi4hn7zge')

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}`, {
      redirect: `${protocol}//${cid}.ipfs.${rootDomain}/`
    })
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello')
  })
})
