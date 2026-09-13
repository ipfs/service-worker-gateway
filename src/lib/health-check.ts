/**
 * Health probes for user-configured gateways and routers.
 *
 * Used by the settings UI to surface pass/fail before a user commits a
 * broken config, and (best-effort, non-blocking) by the service worker when
 * a one-shot URL-param override is present.
 *
 * The probe mirrors the approach suggested for localhost detection in #299:
 * fetch a known CID with `?format=raw` and check for
 * `application/vnd.ipld.raw`.
 */

export interface HealthResult {
  ok: boolean
  /** Human-readable detail for UI display. */
  message: string
  /** Milliseconds the probe took, when `ok` is determinable. */
  ms?: number
}

/**
 * `bafkqaaa` is the base32 identity CIDv1 of empty bytes — the smallest valid
 * CID and already used by the gateway for subdomain support detection. A
 * conformant trustless gateway serves it as a zero-byte raw block with
 * `application/vnd.ipld.raw`.
 */
export const PROBE_CID = 'bafkqaaa'

const RAW_MEDIA_TYPE = 'application/vnd.ipld.raw'
const PROBE_TIMEOUT_MS = 10_000

/**
 * Probe a trustless gateway. Accepts either a normalized gateway template
 * (containing `{cid}`) or a bare origin, and substitutes the probe CID.
 */
export async function probeGateway (entry: string): Promise<HealthResult> {
  const url = gatewayProbeUrl(entry, PROBE_CID)
  if (url == null) {
    return { ok: false, message: `Could not parse gateway entry "${entry}"` }
  }

  return probeFetch(url, RAW_MEDIA_TYPE)
}

/**
 * Probe a delegated routing (`/routing/v1`) endpoint by requesting the
 * routing record for the probe CID. A 200/404 (any structured response) is
 * treated as "reachable"; a network error or non-HTTP response is a failure.
 */
export async function probeRouter (entry: string): Promise<HealthResult> {
  const origin = routerOrigin(entry)
  if (origin == null) {
    return { ok: false, message: `Could not parse router entry "${entry}"` }
  }

  const url = `${origin}/routing/v1/${PROBE_CID}`
  const start = Date.now()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    const ms = Date.now() - start

    // Routing endpoints return 200 with a record, or 404 when the CID is
    // unknown to that router. Both mean the endpoint is alive and speaking
    // the API; 5xx / network errors mean it is not.
    if (res.status >= 200 && res.status < 500) {
      return { ok: true, message: `reachable (HTTP ${res.status})`, ms }
    }

    return { ok: false, message: `unhealthy (HTTP ${res.status})`, ms }
  } catch (err: any) {
    return { ok: false, message: `unreachable: ${err?.message ?? String(err)}` }
  }
}

async function probeFetch (url: string, expectedContentType: string): Promise<HealthResult> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    const ms = Date.now() - start

    const contentType = res.headers.get('content-type') ?? ''
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}`, ms }
    }

    if (!contentType.toLowerCase().includes(expectedContentType)) {
      return { ok: false, message: `unexpected content-type "${contentType}"`, ms }
    }

    return { ok: true, message: 'ok', ms }
  } catch (err: any) {
    return { ok: false, message: `unreachable: ${err?.message ?? String(err)}` }
  }
}

/**
 * Build the probe URL for a gateway entry. Returns null if the entry cannot
 * be parsed into a usable URL.
 */
function gatewayProbeUrl (entry: string, cid: string): string | null {
  const template = normalizeForProbe(entry)
  if (template == null) {
    return null
  }
  return template.replaceAll('{cid}', cid).replaceAll('[cid]', cid)
}

/**
 * Derive a router origin (scheme + host) from a user entry. Returns null if
 * the entry cannot be parsed.
 */
function routerOrigin (entry: string): string | null {
  let str = entry.trim()
  if (str === '') {
    return null
  }
  if (!/^https?:\/\//.test(str)) {
    str = `https://${str}`
  }
  try {
    const u = new URL(str)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

/**
 * Lightweight normalization for probe purposes only. Full canonical
 * normalization (with `?format=raw` enforcement) lives in
 * `src/sw/lib/runtime-config.ts` so the SW does not import this module on
 * the content path.
 */
function normalizeForProbe (entry: string): string | null {
  let str = entry.trim()
  if (str === '') {
    return null
  }
  if (!/^https?:\/\//.test(str)) {
    str = `https://${str}`
  }
  // Strip trailing slashes and any existing format param.
  str = str.replace(/\/+$/, '')
  str = str.replace(/[?&]format=raw$/, '')

  if (str.includes('[cid]') || str.includes('{cid}')) {
    return `${str}?format=raw`
  }

  // Bare origin or origin + path: append /ipfs/{cid}?format=raw unless the
  // path already contains /ipfs/.
  try {
    const u = new URL(str)
    if (u.pathname === '' || u.pathname === '/') {
      return `${u.origin}/ipfs/{cid}?format=raw`
    }
    if (u.pathname.endsWith('/ipfs') || u.pathname.endsWith('/ipfs/')) {
      return `${u.origin}/ipfs/{cid}?format=raw`
    }
    return `${str}/ipfs/{cid}?format=raw`
  } catch {
    return null
  }
}
