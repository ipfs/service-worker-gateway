// Tests for src/cloudflare/snippets/02_shared_sw_installer_cache.ts
//
// These tests verify the cache strategy used by the snippet:
//
//   /ipfs-sw-* (versioned SW assets)
//     - cache key normalized to the base domain
//     - 2xx cached for 24h, everything else not cached
//     - the original request is forwarded unchanged
//
//   installer page (everything else)
//     - cache key normalized to one entry per subdomain
//     - the upstream fetch is rewritten to "/" with
//       Accept: text/html and redirect: manual so a path specific
//       origin response cannot poison the collapsed cache entry
//     - 2xx cached for 24h, 3xx/4xx/5xx not cached so a single bad
//       origin response cannot pin a 24h redirect loop
//     - non-GET methods pass through untouched

import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import handler from '../../../src/cloudflare/snippets/02_shared_sw_installer_cache.ts'
import type { SinonSandbox } from 'sinon'

const EDGE_CACHE_TTL_S = 86400

// State captured from the stubbed fetch on the last call.
let lastRequest: Request | null = null
let lastCfOptions: any = null
let stubStatus = 200
let stubHeaders: Record<string, string> = {}

async function callHandler (inputUrl: string, init: RequestInit = {}): Promise<{ cf: any, request: Request | null, response: Response }> {
  lastRequest = null
  lastCfOptions = null
  const response = await handler.fetch(new Request(inputUrl, init))
  return { cf: lastCfOptions, request: lastRequest, response }
}

describe('02_shared_sw_installer_cache', () => {
  let sandbox: SinonSandbox

  beforeEach(() => {
    lastRequest = null
    lastCfOptions = null
    stubStatus = 200
    stubHeaders = {}

    sandbox = Sinon.createSandbox()
    sandbox.replace(globalThis, 'fetch', (input, init) => {
      lastRequest = input instanceof Request ? input : new Request(input as RequestInfo, init)
      lastCfOptions = (init as any)?.cf ?? null
      return Promise.resolve(new Response(null, { status: stubStatus, headers: new Headers(stubHeaders) }))
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('/ipfs-sw-* (versioned SW assets)', () => {
    it('uses cache key on base domain (.dev)', async () => {
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheEverything).to.equal(true)
    })

    it('uses cache key on base domain (.link)', async () => {
      const { cf } = await callHandler('https://inbrowser.link/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.link/ipfs-sw-main.js')
    })

    it('collapses subdomain cache key to base domain', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.dev/ipfs-sw-main.js')
    })

    it('caches 2xx for 24h', async () => {
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheTtlByStatus['200-299']).to.equal(EDGE_CACHE_TTL_S)
    })

    it('does not cache 3xx, 4xx or 5xx', async () => {
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheTtlByStatus['300-599']).to.equal(0)
    })

    it('forwards URL and method unchanged', async () => {
      const { request } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(request).to.not.equal(null)
      expect(request!.url).to.equal('https://inbrowser.dev/ipfs-sw-main.js')
      expect(request!.method).to.equal('GET')
    })

    it('uses redirect: manual so an origin 3xx cannot poison the asset cache key', async () => {
      const { request } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(request!.redirect).to.equal('manual')
    })
  })

  describe('installer page (every non /ipfs-sw-* path)', () => {
    it('collapses every path on a subdomain to one cache key', async () => {
      const { cf: cfRoot } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/')
      const { cf: cfDeep } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/wiki/Anything?q=1')
      expect(cfRoot.cacheKey).to.equal('https://bafyxxx.ipfs.inbrowser.dev/__sw_installer_html')
      expect(cfDeep.cacheKey).to.equal(cfRoot.cacheKey)
    })

    it('uses a different cache key per subdomain', async () => {
      const { cf: cfA } = await callHandler('https://aaa.ipfs.inbrowser.dev/page')
      const { cf: cfB } = await callHandler('https://bbb.ipfs.inbrowser.dev/page')
      expect(cfA.cacheKey).to.not.equal(cfB.cacheKey)
    })

    it('caches 2xx for 24h', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(cf.cacheTtlByStatus['200-299']).to.equal(EDGE_CACHE_TTL_S)
    })

    it('does not cache 3xx, 4xx or 5xx (no 24h redirect loop is possible)', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(cf.cacheTtlByStatus['300-599']).to.equal(0)
    })

    it('rewrites the upstream URL to "/" regardless of requested path', async () => {
      const { request } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/wiki/Anything?q=1')
      expect(request!.url).to.equal('https://bafyxxx.ipfs.inbrowser.dev/')
    })

    it('rewrites the upstream URL to "/" for root requests too', async () => {
      const { request } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/')
      expect(request!.url).to.equal('https://bafyxxx.ipfs.inbrowser.dev/')
    })

    it('sets Accept: text/html on the upstream fetch', async () => {
      const { request } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(request!.headers.get('Accept')).to.equal('text/html')
    })

    it('uses redirect: manual so origin redirects are visible to the snippet', async () => {
      const { request } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(request!.redirect).to.equal('manual')
    })

    it('preserves :port when rewriting to "/"', async () => {
      const { request } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev:8443/anything')
      expect(request!.url).to.equal('https://bafyxxx.ipfs.inbrowser.dev:8443/')
    })

    it('rewrites HEAD to HEAD "/" and shares the GET cache key', async () => {
      const { cf: gCf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      const { request: hReq, cf: hCf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page', { method: 'HEAD' })
      expect(hReq!.method).to.equal('HEAD')
      expect(hReq!.url).to.equal('https://bafyxxx.ipfs.inbrowser.dev/')
      expect(hReq!.headers.get('Accept')).to.equal('text/html')
      expect(hReq!.redirect).to.equal('manual')
      expect(hCf.cacheKey).to.equal(gCf.cacheKey)
    })

    it('passes POST through untouched (no rewrite, no snippet cache options)', async () => {
      const { request, cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/anything', { method: 'POST' })
      expect(request!.method).to.equal('POST')
      expect(request!.url).to.equal('https://bafyxxx.ipfs.inbrowser.dev/anything')
      expect(cf).to.equal(null)
    })

    it('passes OPTIONS through untouched (CORS preflight survives)', async () => {
      const { request, cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/api', { method: 'OPTIONS' })
      expect(request!.method).to.equal('OPTIONS')
      expect(request!.url).to.equal('https://bafyxxx.ipfs.inbrowser.dev/api')
      expect(cf).to.equal(null)
    })
  })

  describe('HTML and SW asset TTLs match (no HTML/JS skew)', () => {
    it('2xx TTL is the same on both branches', async () => {
      const { cf: cfHtml } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      const { cf: cfAsset } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
      expect(cfHtml.cacheTtlByStatus['200-299']).to.equal(cfAsset.cacheTtlByStatus['200-299'])
    })
  })
})
