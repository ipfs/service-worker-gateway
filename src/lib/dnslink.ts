/**
 * DNSLink resolution implementation for IPFS Service Worker Gateway
 *
 * @module dnslink
 * @see https://specs.ipfs.tech/http-gateways/dnslink-gateway/
 *
 * Features:
 * - LRU cache with TTL for DNS queries
 * - Request deduplication for concurrent queries
 * - Configurable timeouts and retry logic
 * - Input validation and sanitization
 * - Metrics tracking for observability
 * - Production-safe mock records
 */

import { swLogger } from './logger.js'

const log = swLogger.forComponent('dnslink')

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const MAX_RECURSION_DEPTH = 32
const DNS_QUERY_TIMEOUT = 10000 // 10 seconds
const CACHE_TTL_SUCCESS = 5 * 60 * 1000 // 5 minutes for successful resolutions
const CACHE_TTL_FAILURE = 60 * 1000 // 1 minute for failed resolutions
const MAX_CACHE_SIZE = 1000
const MAX_HOSTNAME_LENGTH = 253

/**
 * DNS-over-HTTPS providers with fallback support
 */
const DNS_OVER_HTTPS_PROVIDERS = {
  google: 'https://dns.google/resolve',
  cloudflare: 'https://cloudflare-dns.com/dns-query'
} as const

type DNSProvider = keyof typeof DNS_OVER_HTTPS_PROVIDERS

// =============================================================================
// TYPES
// =============================================================================

export interface DNSLinkResolveResult {
  /** The resolved IPFS path (e.g., /ipfs/QmXxx or /ipfs/bafy...) */
  path: string
  /** The original hostname that was resolved */
  hostname: string
  /** Whether this was resolved from a mock/test record */
  isMock: boolean
  /** Whether this result came from cache */
  fromCache: boolean
  /** Resolution timestamp */
  timestamp: number
  /** Time taken to resolve (ms) */
  duration: number
}

interface CacheEntry {
  result: DNSLinkResolveResult | null
  timestamp: number
  ttl: number
}

interface DNSQueryResponse {
  Answer?: Array<{
    type: number
    data: string
    TTL?: number
  }>
}

// =============================================================================
// CACHE IMPLEMENTATION (LRU with TTL)
// =============================================================================

class DNSLinkCache {
  private cache = new Map<string, CacheEntry>()
  private accessOrder: string[] = []

  get (hostname: string): DNSLinkResolveResult | null | undefined {
    const entry = this.cache.get(hostname)

    if (!entry) {
      return undefined
    }

    // Check if expired
    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      this.cache.delete(hostname)
      this.accessOrder = this.accessOrder.filter(h => h !== hostname)
      return undefined
    }

    // Update access order (LRU)
    this.accessOrder = this.accessOrder.filter(h => h !== hostname)
    this.accessOrder.push(hostname)

    return entry.result
  }

  set (hostname: string, result: DNSLinkResolveResult | null, ttl: number): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(hostname)) {
      const oldest = this.accessOrder.shift()
      if (oldest) {
        this.cache.delete(oldest)
      }
    }

    this.cache.set(hostname, {
      result,
      timestamp: Date.now(),
      ttl
    })

    // Update access order
    this.accessOrder = this.accessOrder.filter(h => h !== hostname)
    this.accessOrder.push(hostname)
  }

  clear (): void {
    this.cache.clear()
    this.accessOrder = []
  }

  size (): number {
    return this.cache.size
  }
}

const dnsCache = new DNSLinkCache()

// =============================================================================
// IN-FLIGHT REQUEST TRACKING (Deduplication)
// =============================================================================

const inFlightRequests = new Map<string, Promise<string | null>>()

function getOrCreateInflightRequest (
  hostname: string,
  factory: () => Promise<string | null>
): Promise<string | null> {
  const existing = inFlightRequests.get(hostname)

  if (existing) {
    log.trace('Reusing in-flight request for %s', hostname)
    return existing
  }

  const promise = factory().finally((): void => {
    inFlightRequests.delete(hostname)
  })

  inFlightRequests.set(hostname, promise)
  return promise
}

// =============================================================================
// METRICS
// =============================================================================

export const dnslinkMetrics = {
  queries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  mockHits: 0,
  successfulResolves: 0,
  failedResolves: 0,
  errors: 0,
  timeouts: 0,
  invalidHostnames: 0,
  dedupedRequests: 0
}

export function getDNSLinkMetrics (): {
  queries: number
  cacheHits: number
  cacheMisses: number
  mockHits: number
  successfulResolves: number
  failedResolves: number
  errors: number
  timeouts: number
  invalidHostnames: number
  dedupedRequests: number
  cacheSize: number
  inFlightRequests: number
} {
  return {
    ...dnslinkMetrics,
    cacheSize: dnsCache.size(),
    inFlightRequests: inFlightRequests.size
  }
}

export function resetDNSLinkMetrics (): void {
  (Object.keys(dnslinkMetrics) as Array<keyof typeof dnslinkMetrics>)
    .forEach((key): void => {
      dnslinkMetrics[key] = 0
    })
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate hostname to prevent DNS rebinding and injection attacks
 */
function isValidHostname (hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') {
    return false
  }

  // Length validation
  if (hostname.length === 0 || hostname.length > MAX_HOSTNAME_LENGTH) {
    return false
  }

  // Hostname format validation (RFC 1123)
  const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i

  if (!hostnameRegex.test(hostname)) {
    return false
  }

  // Reject suspicious patterns in production
  const isProd = self.location?.hostname !== 'localhost' &&
                 !self.location?.port

  if (isProd) {
    const lower = hostname.toLowerCase()
    const blockedPatterns = [
      'localhost',
      '127.',
      '0.0.0.0',
      '::1',
      '.local',
      '.internal',
      '.private',
      '169.254.', // Link-local
      '10.', // Private network
      '172.16.', // Private network
      '192.168.' // Private network
    ]

    if (blockedPatterns.some(pattern => lower.includes(pattern))) {
      return false
    }
  }

  return true
}

/**
 * Validate DNSLink record format
 */
function isValidDNSLinkRecord (record: string): boolean {
  if (!record || typeof record !== 'string') {
    return false
  }

  // Must start with dnslink=/ipfs/ or dnslink=/ipns/
  if (!record.startsWith('dnslink=/ipfs/') && !record.startsWith('dnslink=/ipns/')) {
    return false
  }

  const path = record.replace('dnslink=', '')

  // Basic path validation
  if (path.length < 10) {
    return false
  }

  // Validate CID/path characters
  if (!/^\/ip[fn]s\/[a-zA-Z0-9/.-]+$/.test(path)) {
    return false
  }

  return true
}

// =============================================================================
// MOCK DNS (Development Only)
// =============================================================================

let mockRecordsCache: Record<string, string> | null = null

function getMockDNSRecords (): Record<string, string> {
  // Cache the check to avoid repeated environment checks
  if (mockRecordsCache !== null) {
    return mockRecordsCache
  }

  const isDev = self.location?.hostname === 'localhost' ||
                self.location?.port === '8080' ||
                self.location?.port === '8345' ||
                self.location?.port === '3000'

  if (!isDev) {
    mockRecordsCache = {}
    return mockRecordsCache
  }

  log('Mock DNS records enabled for development')

  mockRecordsCache = {
    'mysite.local': 'dnslink=/ipfs/QmV8GL....KazQ', // sample cid
    'blog.local': 'dnslink=/ipfs/QmV8GL....KazQ',
    'example.local': 'dnslink=/ipfs/QmV8GL....KazQ'
  }

  return mockRecordsCache
}

// =============================================================================
// DNS QUERIES
// =============================================================================

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout (
  url: string,
  options: RequestInit = {},
  timeout: number = DNS_QUERY_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout((): void => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Query DNS TXT record via DNS-over-HTTPS with provider fallback
 */
async function queryDNSViaDOH (
  hostname: string,
  provider: DNSProvider = 'google'
): Promise<string | null> {
  const dnsName = `_dnslink.${hostname}`
  const endpoint = DNS_OVER_HTTPS_PROVIDERS[provider]
  const url = `${endpoint}?name=${encodeURIComponent(dnsName)}&type=TXT`

  try {
    const response = await fetchWithTimeout(url, {
      headers: { Accept: 'application/dns-json' }
    })

    if (!response.ok) {
      log('DNS query failed for %s via %s: %d', dnsName, provider, response.status)
      return null
    }

    const data = await response.json() as DNSQueryResponse

    if (!data.Answer || !Array.isArray(data.Answer) || data.Answer.length === 0) {
      return null
    }

    // Find TXT record with dnslink
    for (const answer of data.Answer) {
      if (answer.type === 16) { // TXT record
        const txtValue = answer.data.replace(/^["']|["']$/g, '').trim()

        if (txtValue.startsWith('dnslink=')) {
          return txtValue
        }
      }
    }

    return null
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      log('DNS query timeout for %s via %s', dnsName, provider)
      dnslinkMetrics.timeouts++
    } else {
      log.error('DNS query error for %s via %s:', dnsName, provider, error)
      dnslinkMetrics.errors++
    }
    return null
  }
}

/**
 * Query DNSLink with caching and request deduplication
 */
export async function queryDNSLink (hostname: string): Promise<string | null> {
  dnslinkMetrics.queries++

  // Validate hostname
  if (!isValidHostname(hostname)) {
    dnslinkMetrics.invalidHostnames++
    log.error('Invalid hostname: %s', hostname)
    return null
  }

  // Check mock records first (dev only)
  const mockRecords = getMockDNSRecords()
  if (mockRecords[hostname]) {
    dnslinkMetrics.mockHits++
    log.trace('Mock DNSLink record found for %s', hostname)
    return mockRecords[hostname]
  }

  // Use request deduplication
  return getOrCreateInflightRequest(hostname, async () => {
    // Try primary provider (Google)
    let record = await queryDNSViaDOH(hostname, 'google')

    // Fallback to Cloudflare if Google fails
    if (!record) {
      log.trace('Falling back to Cloudflare DNS for %s', hostname)
      record = await queryDNSViaDOH(hostname, 'cloudflare')
    }

    return record
  })
}

// =============================================================================
// RESOLUTION
// =============================================================================

/**
 * Recursively resolve DNSLink to an IPFS path with caching
 */
export async function resolveDNSLink (
  hostname: string,
  depth: number = 0,
  maxDepth: number = MAX_RECURSION_DEPTH
): Promise<DNSLinkResolveResult | null> {
  const startTime = performance.now()

  // Check cache first (only at top level)
  if (depth === 0) {
    const cached = dnsCache.get(hostname)

    if (cached !== undefined) {
      dnslinkMetrics.cacheHits++

      if (cached) {
        log.trace('Cache hit for %s', hostname)
        return {
          ...cached,
          fromCache: true
        }
      }

      return null
    }

    dnslinkMetrics.cacheMisses++
  }

  // Recursion depth check
  if (depth >= maxDepth) {
    dnslinkMetrics.errors++
    throw new Error(`DNSLink recursion limit (${maxDepth}) exceeded for ${hostname}`)
  }

  try {
    // Query DNS TXT record
    const txtRecord = await queryDNSLink(hostname)

    if (!txtRecord) {
      // Cache negative result
      if (depth === 0) {
        dnsCache.set(hostname, null, CACHE_TTL_FAILURE)
      }
      dnslinkMetrics.failedResolves++
      return null
    }

    // Validate record format
    if (!isValidDNSLinkRecord(txtRecord)) {
      log('Invalid DNSLink format for %s: %s', hostname, txtRecord)
      dnslinkMetrics.failedResolves++
      return null
    }

    // Parse path
    const match = txtRecord.match(/^dnslink=(\/ip[fn]s\/[^\s]+)/)
    if (!match) {
      dnslinkMetrics.failedResolves++
      return null
    }

    const path = match[1].trim()

    // If points to /ipfs/{cid}, we're done
    if (path.startsWith('/ipfs/')) {
      const duration = performance.now() - startTime
      const result: DNSLinkResolveResult = {
        path,
        hostname,
        isMock: getMockDNSRecords()[hostname] !== undefined,
        fromCache: false,
        timestamp: Date.now(),
        duration
      }

      // Cache successful result (only at top level)
      if (depth === 0) {
        dnsCache.set(hostname, result, CACHE_TTL_SUCCESS)
      }

      dnslinkMetrics.successfulResolves++
      log('Resolved %s to %s in %.2fms', hostname, path, duration)
      return result
    }

    // If points to /ipns/{name}, recursively resolve
    if (path.startsWith('/ipns/')) {
      const pathParts = path.split('/').filter(p => p)
      const ipnsName = pathParts[1]
      const subPath = pathParts.slice(2).join('/')

      log.trace('Following IPNS link from %s to: %s', hostname, ipnsName)

      const resolved = await resolveDNSLink(ipnsName, depth + 1, maxDepth)

      if (resolved && subPath) {
        resolved.path = `${resolved.path}/${subPath}`
      }

      // Cache final result (only at top level)
      if (depth === 0 && resolved) {
        dnsCache.set(hostname, resolved, CACHE_TTL_SUCCESS)
      }

      return resolved
    }

    log('Unexpected DNSLink path format for %s: %s', hostname, path)
    dnslinkMetrics.failedResolves++
    return null
  } catch (error) {
    log.error('Error resolving DNSLink for %s:', hostname, error)
    dnslinkMetrics.errors++
    throw error
  }
}

// =============================================================================
// HIGH-LEVEL API
// =============================================================================

/**
 * Check if a hostname has a valid DNSLink record (lightweight check)
 */
export async function isDNSLinkDomain (hostname: string): Promise<boolean> {
  // Skip subdomain gateway patterns
  if (/^[a-z0-9]{59,}\.ip[fn]s\./i.test(hostname)) {
    return false
  }

  // Skip localhost and IPs
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return false
  }

  // Check cache first
  const cached = dnsCache.get(hostname)
  if (cached !== undefined) {
    return cached !== null
  }

  try {
    const txtRecord = await queryDNSLink(hostname)
    return txtRecord !== null && isValidDNSLinkRecord(txtRecord)
  } catch (error) {
    log.error('Error checking DNSLink for %s:', hostname, error)
    return false
  }
}

/**
 * Extract the content path from a DNSLink hostname and pathname
 * Main entry point for service worker
 */
export async function getDNSLinkContentPath (
  hostname: string,
  pathname: string = '/'
): Promise<string | null> {
  try {
    const resolved = await resolveDNSLink(hostname)

    if (!resolved) {
      return null
    }

    // Normalize pathname
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
    const contentPath = `${resolved.path}${normalizedPath}`

    log('DNSLink content path for %s%s: %s', hostname, pathname, contentPath)

    return contentPath
  } catch (error) {
    log.error('Error getting DNSLink content path for %s%s:', hostname, pathname, error)
    return null
  }
}

/**
 * Clear all caches (useful for testing)
 */
export function clearDNSLinkCache (): void {
  dnsCache.clear()
  inFlightRequests.clear()
  mockRecordsCache = null
  log('DNSLink cache cleared')
}
