// Tests for 02_shared_sw_installer_cache.js Cloudflare Snippet
//
// Run: node cloudflare/snippets/02_shared_sw_installer_cache.test.js
//
// These tests verify caching behavior: cache key normalization for SW assets,
// TTL differentiation, and Cache-Control passthrough.

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { describe, it, beforeEach } from 'node:test'

// Captured cf options from the last fetch() call made by the snippet.
let lastCfOptions = null
// Status code the stubbed origin response will return.
let stubStatus = 200
// Headers on the stubbed origin response.
let stubHeaders = {}

// Stub fetch to capture the cf options and return a controlled response.
globalThis.fetch = (requestOrUrl, init) => {
  lastCfOptions = init?.cf ?? null
  const headers = new Headers(stubHeaders)
  return Promise.resolve(new Response(null, { status: stubStatus, headers }))
}

// Load snippet and expose the handler for testing.
const snippetPath = new URL('./02_shared_sw_installer_cache.js', import.meta.url).pathname
const code = readFileSync(snippetPath, 'utf8')
const wrapped = code.replace('export default', 'const _handler =')
// eslint-disable-next-line no-new-func
const factory = new Function(wrapped + '\nreturn { _handler }')
const { _handler } = factory()

// Helper: call the snippet handler and return { cf, response }.
async function callHandler (inputUrl) {
  lastCfOptions = null
  const response = await _handler.fetch({ url: inputUrl })
  return { cf: lastCfOptions, response }
}

beforeEach(() => {
  lastCfOptions = null
  stubStatus = 200
  stubHeaders = {}
})

// ---- tests ----

describe('/ipfs-sw-* paths (versioned SW assets)', () => {
  it('uses normalized cache key with base domain on .dev', async () => {
    const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
    assert.equal(cf.cacheKey, 'https://inbrowser.dev/ipfs-sw-main.js')
    assert.equal(cf.cacheEverything, true)
  })

  it('uses normalized cache key with base domain on .link', async () => {
    const { cf } = await callHandler('https://inbrowser.link/ipfs-sw-main.js')
    assert.equal(cf.cacheKey, 'https://inbrowser.link/ipfs-sw-main.js')
  })

  it('normalizes subdomain cache key to base domain', async () => {
    const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
    assert.equal(cf.cacheKey, 'https://inbrowser.dev/ipfs-sw-main.js')
  })

  it('normalizes subdomain cache key to base domain on .link', async () => {
    const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-main.js')
    assert.equal(cf.cacheKey, 'https://inbrowser.link/ipfs-sw-main.js')
  })

  it('uses 24h edge TTL for 200s only', async () => {
    const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
    assert.equal(cf.cacheTtlByStatus['200-299'], 86400)
  })

  it('does not cache non-200 responses at edge', async () => {
    const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
    assert.equal(cf.cacheTtlByStatus['300-599'], 0)
  })

  it('does not override Cache-Control header', async () => {
    stubHeaders = { 'Cache-Control': 'original-value' }
    const { response } = await callHandler('https://inbrowser.dev/ipfs-sw-main.js')
    assert.equal(response.headers.get('Cache-Control'), 'original-value')
  })

  it('matches /ipfs-sw- prefix exactly', async () => {
    // /ipfs-sw-bundle-abc123.js should match
    const { cf } = await callHandler('https://inbrowser.dev/ipfs-sw-bundle-abc123.js')
    assert.equal(cf.cacheKey, 'https://inbrowser.dev/ipfs-sw-bundle-abc123.js')
    assert.equal(cf.cacheTtlByStatus['200-299'], 86400)
  })
})

describe('non-SW paths (default cache key, 5min TTL)', () => {
  it('does not set custom cache key for /wiki/', async () => {
    const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/wiki/')
    assert.equal(cf.cacheKey, undefined)
    assert.equal(cf.cacheEverything, true)
  })

  it('does not set custom cache key for root /', async () => {
    const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/')
    assert.equal(cf.cacheKey, undefined)
  })

  it('uses 5-minute edge TTL for 200-399', async () => {
    const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
    assert.equal(cf.cacheTtlByStatus['200-399'], 300)
  })

  it('does not cache 400+ responses at edge', async () => {
    const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/')
    assert.equal(cf.cacheTtlByStatus['400-599'], 0)
  })

  it('does not override Cache-Control for 200 responses', async () => {
    stubStatus = 200
    stubHeaders = { 'Cache-Control': 'original-value' }
    const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
    assert.equal(response.headers.get('Cache-Control'), 'original-value')
  })

  it('does not override Cache-Control for 404 responses', async () => {
    stubStatus = 404
    stubHeaders = { 'Cache-Control': 'no-cache' }
    const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/missing')
    assert.equal(response.headers.get('Cache-Control'), 'no-cache')
  })

  it('does not set custom cache key for .ipns. subdomain', async () => {
    const { cf } = await callHandler('https://en-wikipedia--on--ipfs-org.ipns.inbrowser.dev/wiki/')
    assert.equal(cf.cacheKey, undefined)
    assert.equal(cf.cacheTtlByStatus['200-399'], 300)
  })

  it('does not override Cache-Control for 301 responses', async () => {
    stubStatus = 301
    stubHeaders = { 'Cache-Control': 'max-age=60' }
    const { response } = await callHandler('https://inbrowser.dev/some/path')
    assert.equal(response.headers.get('Cache-Control'), 'max-age=60')
  })

  it('does not override Cache-Control for 500 responses', async () => {
    stubStatus = 500
    stubHeaders = { 'Cache-Control': 'no-store' }
    const { response } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/')
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
  })
})

describe('cacheTtlByStatus key guards', () => {
  it('cacheTtlByStatus keys are defined (not undefined)', async () => {
    const { cf } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
    assert.notEqual(cf.cacheTtlByStatus['200-399'], undefined, 'expected 200-399 key to be defined')
    assert.notEqual(cf.cacheTtlByStatus['400-599'], undefined, 'expected 400-599 key to be defined')
  })
})

describe('TLD-agnostic behavior', () => {
  it('works the same for .dev and .link on SW asset paths', async () => {
    const { cf: cfDev } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/ipfs-sw-main.js')
    const { cf: cfLink } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/ipfs-sw-main.js')
    assert.equal(cfDev.cacheTtlByStatus['200-299'], cfLink.cacheTtlByStatus['200-299'])
    assert.equal(cfDev.cacheKey, 'https://inbrowser.dev/ipfs-sw-main.js')
    assert.equal(cfLink.cacheKey, 'https://inbrowser.link/ipfs-sw-main.js')
  })

  it('works the same for .dev and .link on non-SW paths', async () => {
    const { cf: cfDev } = await callHandler('https://bafyxxx.ipfs.inbrowser.dev/page')
    const { cf: cfLink } = await callHandler('https://bafyxxx.ipfs.inbrowser.link/page')
    assert.equal(cfDev.cacheTtlByStatus['200-399'], cfLink.cacheTtlByStatus['200-399'])
    assert.equal(cfDev.cacheKey, undefined)
    assert.equal(cfLink.cacheKey, undefined)
  })

  it('base domain requests use 5min TTL', async () => {
    const { cf } = await callHandler('https://inbrowser.dev/')
    assert.equal(cf.cacheTtlByStatus['200-399'], 300)
    assert.equal(cf.cacheKey, undefined)
  })
})
