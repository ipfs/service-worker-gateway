import { stop } from '@libp2p/interface'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { HASH_FRAGMENTS } from '../src/lib/constants.ts'
import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'
import type { KuboRPCClient } from 'kubo-rpc-client'

test.describe('dag-pb', () => {
  let kubo: KuboRPCClient

  test.beforeEach(async () => {
    kubo = createKuboRPCClient(process.env.KUBO_RPC)
  })

  test.afterEach(async () => {
    await stop(kubo)
  })

  test('should load path with percent encoded path', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeig675grnxcmshiuzdaz2xalm6ef4thxxds6o6ypakpghm5kghpc34'
    const path = 'Portugal%252C+Espa%C3%B1a=Peninsula%20Ib%C3%A9rica.txt'
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}/${path}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/${path}` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/plain')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
  })

  test('should load index.html from directory', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui'
    const path = 'root2/root3/root4'
    const indexPage = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}/${path}/`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/${path}/` : undefined
    })
    expect(indexPage.status()).toBe(200)
    expect(indexPage.headers()['content-type']).toBe('text/html; charset=utf-8')
    expect(await indexPage.text()).toContain('hello')
  })

  test('should return directory listing after turning off index.html support', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui'
    const path = 'root2/root3/root4'

    // turn off directory index support - this has to happen in the same
    // subdomain as the directory view
    await page.goto(rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/#${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}` : `${protocol}//${rootDomain}/#${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`, {
      waitUntil: 'networkidle'
    })

    await page.click('.e2e-config-page-input-supportDirectoryIndexes label')
    await page.click('#save-config')

    await page.waitForTimeout(1_000)

    const directoryListing = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}/${path}/`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/${path}/` : undefined
    })
    expect(directoryListing.status()).toBe(200)
    expect(directoryListing.headers()['content-type']).toContain('text/html')

    const header = await page.waitForSelector('main header')
    expect(await header?.innerText()).toContain(`Index of /ipfs/${cid}/${path}`)
  })

  test('should include path CIDs in x-ipfs-roots', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui'
    const path = 'root2/root3/root4'
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}/${path}/`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/${path}/` : undefined
    })

    expect(await response.headerValue('x-ipfs-roots')).toBe([
      'bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui',
      'bafybeih2w7hjocxjg6g2ku25hvmd53zj7og4txpby3vsusfefw5rrg5sii',
      'bafybeiawdvhmjcz65x5egzx4iukxc72hg4woks6v6fvgyupiyt3oczk5ja',
      'bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q'
    ].join(', '))
  })
})
