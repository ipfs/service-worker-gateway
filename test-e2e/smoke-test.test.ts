import { peerIdFromString } from '@libp2p/peer-id'
import { base16 } from 'multiformats/bases/base16'
import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import { identity } from 'multiformats/hashes/identity'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { CURRENT_CACHES } from '../src/constants.js'
import { HASH_FRAGMENTS } from '../src/lib/constants.js'
import { CODE_RAW } from '../src/ui/pages/multicodec-table.ts'
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
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/` : undefined
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
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/${path}/` : `${protocol}//${rootDomain}/ipfs/${cid}/${path}/`
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
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/${path}/` : `${protocol}//${rootDomain}/ipfs/${cid}/${path}/`
    })
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/html')

    // there should be a dir listing that has the CID of the root3 node, and the
    // name of the root4 node with a short name
    const header = await page.waitForSelector('main header')
    expect(await header?.innerText()).toContain('Index of /ipfs/bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui/root2/root3')
    const headerCid = await header.$('.ipfs-hash')
    expect(await headerCid?.innerText()).toContain('bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui')

    // .unixfs-directory will have a list of rows with links to the files in the
    // directory. One link where the name is, and one link with a hash
    const table = await page.waitForSelector('.unixfs-directory')

    const nameCells = await table.$$('.name-cell')
    expect(await nameCells?.[0]?.innerText()).toContain('..')
    expect(await nameCells?.[1]?.innerText()).toContain('root4')

    const hashCells = await table.$$('.hash-cell')
    expect(await hashCells?.[0]?.innerText()).toContain('bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q')
  })

  test('request to /ipns/<libp2p-key> returns expected content', async ({ page, protocol, rootDomain }) => {
    const name = 'k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam'

    // should not be cached
    expect(await hasCacheEntry(page, CURRENT_CACHES.mutable, name)).toBeFalsy()
    expect(await hasCacheEntry(page, CURRENT_CACHES.immutable, name)).toBeFalsy()

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipns/${name}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${name}.ipns.${rootDomain}/` : `${protocol}//${rootDomain}/ipns/${name}/`
    })
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello')

    // should be in the mutable cache only
    expect(await hasCacheEntry(page, CURRENT_CACHES.mutable, name)).toBeTruthy()
    expect(await hasCacheEntry(page, CURRENT_CACHES.immutable, name)).toBeFalsy()
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

  test('service worker un-registers automatically when ttl expires', async ({ page, protocol, rootDomain }) => {
    // TODO: this test fails for firefox in CI, works locally
    if (process.env.CI != null) {
      test.skip()
      return
    }

    async function hasRegistration (): Promise<boolean> {
      return page.evaluate(async () => {
        return await window.navigator.serviceWorker.getRegistration() != null
      })
    }

    const serviceWorkerRegistrationTTL = 1_000

    // set the ttl in milliseconds
    await setConfig(page, {
      serviceWorkerRegistrationTTL
    })

    const content = 'unregister after ttl expiry test'
    const cid = CID.createV1(CODE_RAW, identity.digest(uint8ArrayFromString(content)))
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/` : undefined
    })
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain(content)

    expect(await hasRegistration()).toBe(true)

    // wait for the ttl to expire
    await page.waitForTimeout(serviceWorkerRegistrationTTL * 2)

    // invoke the service worker again so it checks the TTL and finds that it
    // has expired
    await page.reload({
      waitUntil: 'networkidle'
    })

    // give the service worker time to unregister
    await page.waitForTimeout(serviceWorkerRegistrationTTL * 2)

    expect(await hasRegistration()).toBe(false)
  })

  test('normalizes base16 CIDs to base32', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafkqablimvwgy3y'
    const asBase16 = CID.parse(cid).toString(base16)

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${asBase16}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/` : undefined
    })
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello')
  })

  test('normalizes base16 IPNS names to base36', async ({ page, protocol, rootDomain }) => {
    const name = 'k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam'
    const asBase16 = peerIdFromString(name).toCID().toString(base16)

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipns/${asBase16}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${name}.ipns.${rootDomain}/` : undefined
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
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/` : undefined
    })
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello')
  })

  test('converts the same block to different formats', async ({ page, protocol, rootDomain }) => {
    const obj = {
      hello: 'world'
    }
    const buf = json.encode(obj)
    const cid = CID.createV1(CODE_RAW, identity.digest(buf))

    const rawResponse = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?format=raw`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/?format=raw` : undefined
    })
    expect(rawResponse.status()).toBe(200)
    expect(await rawResponse.headerValue('content-type')).toBe('application/vnd.ipld.raw')
    expect(new Uint8Array(await rawResponse.body())).toStrictEqual(buf)

    // sending a different format should cause a response cache miss
    const jsonResponse = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?format=json`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/?format=json` : undefined
    })
    expect(jsonResponse.status()).toBe(200)
    expect(await jsonResponse.headerValue('content-type')).toBe('application/json')
    expect(await jsonResponse.json()).toStrictEqual(obj)
  })
})
