/**
 * Verifiable ENS resolution for .eth names.
 *
 * Flow:
 * 1. Fetch the `safe` block header from the primary Ethereum RPC.
 * 2. Fetch the same block number from two independent witness RPCs.
 * 3. Verify all three agree on the same block hash and the block is recent.
 * 4. Build a viem client backed by a custom provider pinned to that safe block.
 * 5. Delegate ENS resolver/contenthash reads to viem actions.
 *
 * viem is lazy-imported so ENS/Ethereum code is never loaded for non-.eth
 * requests.
 */

import {
  createQuorumTrustedBlockSelector,
  createVerifiedTransport
} from '@ipshipyard/verified-eth-provider'
import type {
  TrustedBlock,
  TrustedBlockProvider,
  VerifiedTransport
} from '@ipshipyard/verified-eth-provider'
import type { DNSResponse, QueryOptions, RecordType } from '@multiformats/dns'
import type { DNSResolver } from '@multiformats/dns/resolvers'
import { config } from '../../config/index.ts'
import { getSwLogger } from '../../lib/logger.ts'

const log = getSwLogger('ens-resolver')
const ENS_DNSLINK_TTL_SECONDS = 60

interface EnsJsTools {
  normalize (name: string): string
  createEnsPublicClient (opts: any): any
  addEnsContracts (chain: any): any
  mainnet: any
  getContentHashRecord (client: any, opts: { name: string, gatewayUrls?: string[], strict?: boolean }): Promise<any>
}

let ensToolsCache: EnsJsTools | null = null
let trustedBlockProvider: TrustedBlockProvider | null = null

function getTrustedBlockProvider (): TrustedBlockProvider {
  if (trustedBlockProvider == null) {
    trustedBlockProvider = createQuorumTrustedBlockSelector(config.ens, {
      log: getSwLogger('verified-eth-rpc-provider')
    })
  }

  return trustedBlockProvider
}

async function loadEnsTools (): Promise<EnsJsTools> {
  if (ensToolsCache != null) {
    return ensToolsCache
  }

  const [
    { normalize },
    { createEnsPublicClient, addEnsContracts },
    { getContentHashRecord },
    { mainnet }
  ] = await Promise.all([
    import('viem/ens'),
    import('@ensdomains/ensjs'),
    import('@ensdomains/ensjs/public'),
    import('viem/chains')
  ])

  const tools: EnsJsTools = {
    normalize,
    createEnsPublicClient,
    addEnsContracts,
    mainnet,
    getContentHashRecord
  }

  ensToolsCache = tools

  return tools
}

async function resolveDnsLinkWithEnsJs (
  ensTools: EnsJsTools,
  normalizedName: string,
  transport: VerifiedTransport,
  signal?: AbortSignal
): Promise<{ protocolType: string, decoded: string } | null> {
  void signal

  const client = ensTools.createEnsPublicClient({
    chain: ensTools.addEnsContracts(ensTools.mainnet),
    transport
  })

  return ensTools.getContentHashRecord(client, {
    name: normalizedName,
    strict: false
  }) as Promise<{ protocolType: string, decoded: string } | null>
}

function contenthashToDnsLinkPath (protocolType: string, decoded: string): string {
  switch (protocolType) {
    case 'ipfs':
      return `/ipfs/${decoded}`
    case 'ipns':
      return `/ipns/${decoded}`
    default:
      throw new EnsUnsupportedContenthashError(
        `Unsupported ENS contenthash protocol "${protocolType}" for this name`
      )
  }
}

export interface EnsDnsLinkResult {
  dnsLinkPath: string
  blockNumber: string
  blockHash: string
}

export async function resolveEthDnsLink (name: string, signal?: AbortSignal): Promise<EnsDnsLinkResult> {
  log('resolving ENS name via ensjs-backed provider: %s', name)

  const trustedBlockProvider = getTrustedBlockProvider()
  const [ensTools, transport] = await Promise.all([
    loadEnsTools(),
    createVerifiedTransport({
      rpcUrl: config.ens.primaryRpc,
      trustedBlock: async () => trustedBlockProvider(signal)
    }, {
      log: getSwLogger('verified-eth-rpc-provider')
    })
  ])
  void transport.prewarmVerificationDependencies().catch(err => {
    log('prewarm of ENS verification dependencies failed: %s', err instanceof Error ? err.message : String(err))
  })

  const safeBlock: TrustedBlock = transport.trustedBlock

  let normalizedName: string
  try {
    normalizedName = ensTools.normalize(name)
  } catch (err: any) {
    throw new EnsResolutionError(`Invalid ENS name "${name}": ${err.message}`)
  }

  const contentHash = await resolveDnsLinkWithEnsJs(
    ensTools,
    normalizedName,
    transport,
    signal
  )

  if (contentHash == null || contentHash.protocolType == null || contentHash.decoded == null || contentHash.decoded === '') {
    throw new EnsNoContenthashError(`ENS name "${name}" has no contenthash record`)
  }

  const dnsLinkPath = contenthashToDnsLinkPath(contentHash.protocolType, contentHash.decoded)

  log('ENS contenthash for %s: protocol=%s decoded=%s block=%s', name, contentHash.protocolType, contentHash.decoded, safeBlock.number)

  return {
    dnsLinkPath,
    blockNumber: safeBlock.number,
    blockHash: safeBlock.hash
  }
}

function stripDnsLinkPrefix (domain: string): string {
  return domain.startsWith('_dnslink.') ? domain.slice('_dnslink.'.length) : domain
}

function buildDnsResponse (domain: string, recordData: string, type: RecordType): DNSResponse {
  return {
    Status: 0,
    TC: false,
    RD: true,
    RA: true,
    AD: false,
    CD: false,
    Question: [{ name: domain, type }],
    Answer: [{
      name: domain,
      type,
      TTL: ENS_DNSLINK_TTL_SECONDS,
      data: recordData
    }]
  }
}

export function createEnsDnsResolver (): DNSResolver {
  return async (domain: string, options?: QueryOptions): Promise<DNSResponse> => {
    const normalizedDomain = stripDnsLinkPrefix(domain)

    if (!normalizedDomain.endsWith('.eth')) {
      const err = new Error(`ENS DNS resolver cannot resolve non-.eth domain: ${domain}`) as Error & { code?: string }
      err.code = 'ENOTFOUND'
      throw err
    }

    let requestedTypes: RecordType[] = []
    if (options?.types != null) {
      requestedTypes = Array.isArray(options.types)
        ? options.types
        : [options.types]
    }

    if (requestedTypes.length > 0 && !requestedTypes.includes(16 as RecordType)) {
      const type = requestedTypes[0]
      return buildDnsResponse(domain, '', type)
    }

    const result = await resolveEthDnsLink(normalizedDomain, options?.signal)
    const recordData = `dnslink=${result.dnsLinkPath}`

    log('synthetic DNSLink TXT for %s: %s (block %s)', normalizedDomain, recordData, result.blockNumber)

    return buildDnsResponse(domain, recordData, 16 as RecordType)
  }
}

export class EnsResolutionError extends Error {
  constructor (message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'EnsResolutionError'
  }
}

export class EnsNoContenthashError extends EnsResolutionError {
  constructor (message: string) {
    super(message)
    this.name = 'EnsNoContenthashError'
  }
}

export class EnsUnsupportedContenthashError extends EnsResolutionError {
  constructor (message: string) {
    super(message)
    this.name = 'EnsUnsupportedContenthashError'
  }
}
