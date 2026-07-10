// Tests for 02_shared_sw_installer_cache.ts Cloudflare Snippet
//
// These tests verify caching behavior: cache key normalization for SW assets,
// TTL differentiation, Cache-Control passthrough, and the installer branch
// upstream rewrite (path → "/", Accept: text/html, redirect: manual,
// GET/HEAD only) that prevents path-specific origin responses from poisoning
// the collapsed per-subdomain cache entry.
//
// The asset branch additionally refuses to serve a text/html body under a
// /ipfs-sw-* URL. That body is the origin's installer page standing in for a
// file it does not have, and pinning it under the shared base-domain key is
// what took production down in #1155.

import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import handler from '../../../src/cloudflare/snippets/02_shared_sw_installer_cache.ts'
import type { SinonSandbox } from 'sinon'

// Captured cf options from every fetch() call made by the snippet, in order.
let cfOptions: any[] = []
// Captured Requests from every fetch() call made by the snippet, in order.
let requests: Request[] = []
// Status code the stubbed origin response will return.
let stubStatus = 200
// Headers on the stubbed origin response.
let stubHeaders: Record<string, string> = {}
// When set, supplies the response for each fetch() call by index, letting a
// test model "the shared cache entry is poisoned but origin is healthy".
let stubByCall: Array<{ status?: number, headers?: Record<string, string> }> | null = null

interface HandlerResult {
  cf: any
  request: Request | null
  response: Response
  calls: number
}

// Helper: call the snippet handler and return the first fetch's cf/request.
async function callHandler (inputUrl: string, init: RequestInit = {}): Promise<HandlerResult> {
  cfOptions = []
  requests = []
  const response = await handler.fetch(new Request(inputUrl, init))

  return {
    cf: cfOptions[0] ?? null,
    request: requests[0] ?? null,
    response,
    calls: requests.length
  }
}

const HTML = { 'content-type': 'text/html; charset=utf-8' }
const JS = { 'content-type': 'application/javascript' }

describe('02_shared_sw_installer_cache', () => {
  let sandbox: SinonSandbox

  beforeEach(() => {
    cfOptions = []
    requests = []
    stubStatus = 200
    stubHeaders = {}
    stubByCall = null

    sandbox = Sinon.createSandbox()
    sandbox.replace(globalThis, 'fetch', (requestOrUrl, init) => {
      const index = requests.length
      requests.push(requestOrUrl instanceof Request ? requestOrUrl : new Request(requestOrUrl as RequestInfo, init))
      cfOptions.push(init?.cf ?? null)

      const stub = stubByCall?.[index]
      const status = stub?.status ?? stubStatus
      const headers = new Headers(stub?.headers ?? stubHeaders)

      return Promise.resolve(new Response(null, { status, headers }))
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('/ipfs-sw-* paths (versioned SW assets)', () => {
    it('uses normalized cache key with base domain on .dev', async () => {
      stubHeaders = JS
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheEverything).to.equal(true)
    })

    it('normalizes subdomain cache key to base domain', async () => {
      stubHeaders = JS
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.dev/ipfs-sw-main.js')
    })

    it('normalizes subdomain cache key to base domain on .link', async () => {
      stubHeaders = JS
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.link/ipfs-sw-main.js')
    })

    it('uses 24h edge TTL for 200s only', async () => {
      stubHeaders = JS
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheTtlByStatus['200-299']).to.equal(86400)
    })

    it('does not cache non-200 responses at edge', async () => {
      stubHeaders = JS
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheTtlByStatus['300-599']).to.equal(0)
    })

    it('does not override Cache-Control on a real asset', async () => {
      stubHeaders = { ...JS, 'cache-control': 'original-value' }
      const { response } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(response.headers.get('cache-control')).to.equal('original-value')
    })

    it('matches /ipfs-sw- prefix exactly', async () => {
      stubHeaders = JS
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-bundle-abc123.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.dev/ipfs-sw-bundle-abc123.js')
      expect(cf.cacheTtlByStatus['200-299']).to.equal(86400)
    })

    it('uses redirect: manual so an origin 3xx cannot poison the asset cache key', async () => {
      stubHeaders = JS
      const { request } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(request!.redirect).to.equal('manual')
    })

    it('serves a real asset straight from the shared entry, without a second fetch', async () => {
      stubHeaders = JS
      const { response, calls } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(response.status).to.equal(200)
      expect(calls).to.equal(1)
    })

    // The regression from #1155, which #1156 fixes: status alone cannot tell a
    // real asset from the origin's SPA fallback, a 200 carrying text/html.
    it('never serves a 200 text/html body as an asset', async () => {
      stubHeaders = HTML
      const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-index-ABC123.js')
      expect(response.status).to.equal(404)
      expect(response.headers.get('content-type')).to.not.equal('text/html; charset=utf-8')
    })

    it('bypasses the poisoned entry and serves the asset once origin has it', async () => {
      // first fetch: the poisoned shared entry. second: origin, now healthy.
      stubByCall = [{ headers: HTML }, { headers: JS }]
      const { response, calls } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-main.js')
      expect(response.status).to.equal(200)
      expect(response.headers.get('content-type')).to.equal('application/javascript')
      expect(calls).to.equal(2)
    })

    // cf.cacheTtl: 0 would only expire what it writes; it does not skip the
    // cache read. On the base domain the request URL *is* the shared cacheKey,
    // so without no-store the retry would be answered by the poisoned entry.
    it('skips the cache read on the retry, rather than just the write', async () => {
      stubByCall = [{ headers: HTML }, { headers: JS }]
      await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(requests[1].cache).to.equal('no-store')
      expect(cfOptions[1]).to.equal(null)
    })

    it('retries the same URL it was asked for', async () => {
      stubByCall = [{ headers: HTML }, { headers: JS }]
      await callHandler('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-main.js')
      expect(requests[1].url).to.equal('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-main.js')
      expect(requests[1].redirect).to.equal('manual')
    })

    it('404s when origin still does not have the file', async () => {
      stubByCall = [{ headers: HTML }, { headers: HTML }]
      const { response, calls } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(response.status).to.equal(404)
      expect(calls).to.equal(2)
    })

    it('marks the 404 uncacheable so the next request can retry', async () => {
      stubHeaders = HTML
      const { response } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(response.headers.get('cache-control')).to.equal('no-store')
    })

    it('treats a 2xx with no content type as missing', async () => {
      stubHeaders = {}
      const { response } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(response.status).to.equal(404)
    })

    it('passes a 3xx through without a retry', async () => {
      stubStatus = 302
      const { response, calls } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(response.status).to.equal(302)
      expect(calls).to.equal(1)
    })

    it('passes a 404 through without a retry', async () => {
      stubStatus = 404
      const { response, calls } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(response.status).to.equal(404)
      expect(calls).to.equal(1)
    })

    it('passes a 500 through without a retry', async () => {
      stubStatus = 500
      const { response, calls } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(response.status).to.equal(500)
      expect(calls).to.equal(1)
    })

    it('lets a source map through (not html, so a real asset)', async () => {
      stubHeaders = { 'content-type': 'application/json' }
      const { response } = await callHandler('https://inbrowser.dev/ipfs-sw-index-ABC.js.map')
      expect(response.status).to.equal(200)
    })
  })

  describe('non-SW paths (per-subdomain installer cache key, 24h TTL)', () => {
    it('collapses /wiki/ to per-subdomain installer cache key', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/wiki/')
      expect(cf.cacheKey).to.equal('https://bafyxxx.ipfs.inbrowser.dev/__sw_installer_html')
      expect(cf.cacheEverything).to.equal(true)
    })

    it('collapses root / to per-subdomain installer cache key', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/')
      expect(cf.cacheKey).to.equal('https://bafyxxx.ipfs.inbrowser.dev/__sw_installer_html')
    })

    it('shares cache key across long-tail paths on the same subdomain', async () => {
      const { cf: cf1 } = await callHandler('https://en-wikipedia--on--ipfs-org.ipns.inbrowser.link/wiki/Charles_Krum.html')
      const { cf: cf2 } = await callHandler('https://en-wikipedia--on--ipfs-org.ipns.inbrowser.link/wiki/Tver_Carriage_Works')
      expect(cf1.cacheKey).to.equal(cf2.cacheKey)
    })

    it('uses different cache key for different subdomains', async () => {
      const { cf: cfA } = await callHandler('https://aaa.ipfs.inbrowser.dev/page')
      const { cf: cfB } = await callHandler('https://bbb.ipfs.inbrowser.dev/page')
      expect(cfA.cacheKey).to.not.equal(cfB.cacheKey)
    })

    it('uses 24h edge TTL for 2xx only', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(cf.cacheTtlByStatus['200-299']).to.equal(86400)
    })

    it('does not cache 3xx, 4xx or 5xx responses at edge', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/')
      expect(cf.cacheTtlByStatus['300-599']).to.equal(0)
    })

    it('does not override Cache-Control for 200 responses', async () => {
      stubStatus = 200
      stubHeaders = { 'Cache-Control': 'original-value' }
      const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(response.headers.get('Cache-Control')).to.equal('original-value')
    })

    it('does not override Cache-Control for 404 responses', async () => {
      stubStatus = 404
      stubHeaders = { 'Cache-Control': 'no-cache' }
      const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/missing')
      expect(response.headers.get('Cache-Control')).to.equal('no-cache')
    })

    it('uses per-subdomain cache key on .ipns. subdomain', async () => {
      const { cf } = await callHandler('https://en-wikipedia--on--ipfs-org.ipns.inbrowser.dev/wiki/')
      expect(cf.cacheKey).to.equal('https://en-wikipedia--on--ipfs-org.ipns.inbrowser.dev/__sw_installer_html')
      expect(cf.cacheTtlByStatus['200-299']).to.equal(86400)
    })

    it('does not override Cache-Control for 301 responses', async () => {
      stubStatus = 301
      stubHeaders = { 'Cache-Control': 'max-age=60' }
      const { response } = await callHandler('https://inbrowser.dev/some/path')
      expect(response.headers.get('Cache-Control')).to.equal('max-age=60')
    })

    it('does not override Cache-Control for 500 responses', async () => {
      stubStatus = 500
      stubHeaders = { 'Cache-Control': 'no-store' }
      const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/')
      expect(response.headers.get('Cache-Control')).to.equal('no-store')
    })

    // An installer path that happens to look like HTML is exactly right, so the
    // asset branch's content-type check must not leak into this branch.
    it('serves the installer html untouched', async () => {
      stubHeaders = HTML
      const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/wiki/')
      expect(response.status).to.equal(200)
    })

    // The next block covers the cache-poisoning fix: the upstream fetch
    // must be rewritten so a path-specific origin response (e.g. a 308
    // redirect) cannot be pinned under the per-subdomain cache key.

    it('rewrites the upstream URL to "/" regardless of requested path', async () => {
      const { request } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/wiki/Anything?q=1')
      expect(request!.url).to.equal('https://bafyxxx.ipfs.inbrowser.dev/')
    })

    it('sets Accept: text/html on the upstream fetch', async () => {
      const { request } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(request!.headers.get('Accept')).to.equal('text/html')
    })

    it('uses redirect: manual so an origin 3xx cannot poison the installer cache key', async () => {
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

  describe('cacheTtlByStatus key guards', () => {
    it('cacheTtlByStatus keys are defined (not undefined)', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(cf.cacheTtlByStatus['200-299']).to.not.equal(undefined, 'expected 200-299 key to be defined')
      expect(cf.cacheTtlByStatus['300-599']).to.not.equal(undefined, 'expected 300-599 key to be defined')
    })

    it('HTML and versioned SW asset TTLs match (avoid HTML-JS skew)', async () => {
      const { cf: cfHtml } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      stubHeaders = JS
      const { cf: cfAsset } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
      expect(cfHtml.cacheTtlByStatus['200-299']).to.equal(cfAsset.cacheTtlByStatus['200-299'])
    })
  })

  describe('TLD-agnostic behavior', () => {
    it('works the same for .dev and .link on SW asset paths', async () => {
      stubHeaders = JS
      const { cf: cfDev } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
      const { cf: cfLink } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-main.js')
      expect(cfDev.cacheTtlByStatus['200-299']).to.equal(cfLink.cacheTtlByStatus['200-299'])
      expect(cfDev.cacheKey).to.equal('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cfLink.cacheKey).to.equal('https://inbrowser.link/ipfs-sw-main.js')
    })

    it('works the same for .dev and .link on non-SW paths', async () => {
      const { cf: cfDev } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      const { cf: cfLink } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/page')
      expect(cfDev.cacheTtlByStatus['200-299']).to.equal(cfLink.cacheTtlByStatus['200-299'])
      expect(cfDev.cacheKey).to.equal('https://bafyxxx.ipfs.inbrowser.dev/__sw_installer_html')
      expect(cfLink.cacheKey).to.equal('https://bafyxxx.ipfs.inbrowser.link/__sw_installer_html')
    })

    it('base domain requests use 24h TTL and per-host installer key', async () => {
      const { cf } = await callHandler('https://inbrowser.dev/')
      expect(cf.cacheTtlByStatus['200-299']).to.equal(86400)
      expect(cf.cacheKey).to.equal('https://inbrowser.dev/__sw_installer_html')
    })
  })
})
