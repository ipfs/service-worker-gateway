// Tests for 02_shared_sw_installer_cache.js Cloudflare Snippet
//
// Run: node cloudflare/snippets/02_shared_sw_installer_cache.test.js
//
// These tests verify caching behavior: cache key normalization for SW assets,
// TTL differentiation, Cache-Control passthrough, and Cloudflare
// challenge-state (`__cf_*` query params) stripping at the edge.

import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import handler from '../../../src/cloudflare/snippets/02_shared_sw_installer_cache.ts'
import type { SinonSandbox } from 'sinon'

// Captured cf options from the last fetch() call made by the snippet.
let lastCfOptions = null
// True if the stubbed fetch ran. False if the snippet returned a synthetic
// redirect first.
let fetchWasCalled = false
// Status code the stubbed origin response will return.
let stubStatus = 200
// Headers on the stubbed origin response.
let stubHeaders = {}

// Helper: call the snippet handler and return { cf, response }.
async function callHandler (inputUrl: string): Promise<{ cf: any, response: Response }> {
  lastCfOptions = null
  fetchWasCalled = false
  const response = await handler.fetch(new Request(inputUrl))

  return { cf: lastCfOptions, response }
}

describe('02_shared_sw_installer_cache', () => {
  let sandbox: SinonSandbox

  beforeEach(() => {
    lastCfOptions = null
    fetchWasCalled = false
    stubStatus = 200
    stubHeaders = {}

    sandbox = Sinon.createSandbox()
    sandbox.replace(globalThis, 'fetch', (requestOrUrl, init) => {
      fetchWasCalled = true
      lastCfOptions = init?.cf ?? null
      const headers = new Headers(stubHeaders)
      return Promise.resolve(new Response(null, { status: stubStatus, headers }))
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('/ipfs-sw-* paths (versioned SW assets)', () => {
    it('uses normalized cache key with base domain on .dev', async () => {
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheEverything).to.equal(true)
    })

    it('uses normalized cache key with base domain on .link', async () => {
      const { cf } = await callHandler('https://inbrowser.link/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.link/ipfs-sw-main.js')
    })

    it('normalizes subdomain cache key to base domain', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.dev/ipfs-sw-main.js')
    })

    it('normalizes subdomain cache key to base domain on .link', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-main.js')
      expect(cf.cacheKey).to.equal('https://inbrowser.link/ipfs-sw-main.js')
    })

    it('uses 24h edge TTL for 200s only', async () => {
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheTtlByStatus['200-299']).to.equal(86400)
    })

    it('does not cache non-200 responses at edge', async () => {
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cf.cacheTtlByStatus['300-599']).to.equal(0)
    })

    it('does not override Cache-Control header', async () => {
      stubHeaders = { 'Cache-Control': 'original-value' }
      const { response } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
      expect(response.headers.get('Cache-Control'), 'original-value')
    })

    it('matches /ipfs-sw- prefix exactly', async () => {
      // /ipfs-sw-bundle-abc123.js should match
      const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-bundle-abc123.js')
      expect(cf.cacheKey, 'https://inbrowser.dev/ipfs-sw-bundle-abc123.js')
      expect(cf.cacheTtlByStatus['200-299']).to.equal(86400)
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

    it('uses 24h edge TTL for 200-399', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(cf.cacheTtlByStatus['200-399']).to.equal(86400)
    })

    it('does not cache 400+ responses at edge', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/')
      expect(cf.cacheTtlByStatus['400-599']).to.equal(0)
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
      expect(cf.cacheTtlByStatus['200-399']).to.equal(86400)
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
  })

  describe('cacheTtlByStatus key guards', () => {
    it('cacheTtlByStatus keys are defined (not undefined)', async () => {
      const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      expect(cf.cacheTtlByStatus['200-399']).to.not.equal(undefined, 'expected 200-399 key to be defined')
      expect(cf.cacheTtlByStatus['400-599']).to.not.equal(undefined, 'expected 400-599 key to be defined')
    })

    it('HTML and versioned SW asset TTLs match (avoid HTML-JS skew)', async () => {
      const { cf: cfHtml } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      const { cf: cfAsset } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
      expect(cfHtml.cacheTtlByStatus['200-399']).to.equal(cfAsset.cacheTtlByStatus['200-299'])
    })
  })

  describe('TLD-agnostic behavior', () => {
    it('works the same for .dev and .link on SW asset paths', async () => {
      const { cf: cfDev } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
      const { cf: cfLink } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-main.js')
      expect(cfDev.cacheTtlByStatus['200-299']).to.equal(cfLink.cacheTtlByStatus['200-299'])
      expect(cfDev.cacheKey).to.equal('https://inbrowser.dev/ipfs-sw-main.js')
      expect(cfLink.cacheKey).to.equal('https://inbrowser.link/ipfs-sw-main.js')
    })

    it('works the same for .dev and .link on non-SW paths', async () => {
      const { cf: cfDev } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
      const { cf: cfLink } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/page')
      expect(cfDev.cacheTtlByStatus['200-399']).to.equal(cfLink.cacheTtlByStatus['200-399'])
      expect(cfDev.cacheKey).to.equal('https://bafyxxx.ipfs.inbrowser.dev/__sw_installer_html')
      expect(cfLink.cacheKey).to.equal('https://bafyxxx.ipfs.inbrowser.link/__sw_installer_html')
    })

    it('base domain requests use 24h TTL and per-host installer key', async () => {
      const { cf } = await callHandler('https://inbrowser.dev/')
      expect(cf.cacheTtlByStatus['200-399']).to.equal(86400)
      expect(cf.cacheKey).to.equal('https://inbrowser.dev/__sw_installer_html')
    })
  })

  describe('Cloudflare challenge-state stripping', () => {
    it('strips __cf_chl_tk, 302s to the clean URL, does not cache the redirect or call origin', async () => {
      const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/wiki/Article?__cf_chl_tk=abc123')
      expect(response.status).to.equal(302)
      expect(response.headers.get('Location')).to.equal('https://bafyxxx.ipfs.inbrowser.dev/wiki/Article')
      expect(response.headers.get('Cache-Control')).to.equal('no-store')
      expect(fetchWasCalled).to.equal(false)
    })

    it('catches any future __cf_* variant via the prefix match', async () => {
      // Pins the future-proofing promise: a hypothetical Cloudflare-
      // internal rename inside the __cf_* namespace still gets stripped
      // with no code change.
      const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/?__cf_v2_tk=hypothetical')
      expect(response.status).to.equal(302)
      expect(response.headers.get('Location')).to.equal('https://bafyxxx.ipfs.inbrowser.dev/')
    })

    it('preserves real gateway query params on the redirect', async () => {
      // ?filename=, ?download=, ?format=, ?path=, ... must survive.
      const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/file?__cf_chl_tk=tok&filename=foo.txt&download=true')
      const location = new URL(response.headers.get('Location') ?? '')
      expect(location.searchParams.get('filename')).to.equal('foo.txt')
      expect(location.searchParams.get('download')).to.equal('true')
      expect(location.searchParams.has('__cf_chl_tk')).to.equal(false)
    })

    it('does not redirect when no __cf_* param is present', async () => {
      const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/?filename=foo.txt')
      expect(response.status).to.equal(200)
      expect(fetchWasCalled).to.equal(true)
    })
  })
})
