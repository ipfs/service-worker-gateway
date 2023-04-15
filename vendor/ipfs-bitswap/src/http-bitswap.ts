
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AbortOptions } from '@libp2p/interfaces'
import type { CID, Version } from 'multiformats'
import type { ProgressOptions } from 'progress-events'
import type { Bitswap, WantListEntry, BitswapWantBlockProgressEvents, Ledger, Stats, BitswapOptions } from './index.js'
import type { Blockstore } from 'interface-blockstore'
import type { BitswapNetworkNotifyProgressEvents } from './network.js'
import { fetchViaDuplex } from '@marcopolo_/libp2p-fetch'
import type { Libp2p } from 'libp2p'

// TODO: this should be a different protocol id
const IPFS_GATEWAY_PROTOCOL = '/libp2p-http'

interface WithTimestamp<T> { val: T, timestamp: number }

export interface HttpBitswapOptions {
  httpOverLibp2pPeersLimit?: number
  bootstrapHttpOnlyPeers?: string[]
  bitswapOptions?: BitswapOptions
}

export const defaultOptions = {
  httpOverLibp2pPeersLimit: 5,
  bootstrapHttpOnlyPeers: [],
  bitswapOptions: {}
}

export class HttpBitswap implements Bitswap {
  stats: Stats = this.innerBitswap.stats
  peers: PeerId[] = this.innerBitswap.peers
  httpOverLibp2pPeersLimit: number
  httpOverLibp2pPeers: Array<WithTimestamp<PeerId>> = []
  httpOnlyPeers: string[] = []

  constructor (private readonly libp2p: Libp2p, private readonly innerBitswap: Bitswap, private readonly blockstore: Blockstore, options: HttpBitswapOptions = defaultOptions) {
    this.httpOverLibp2pPeersLimit = options.httpOverLibp2pPeersLimit ?? defaultOptions.httpOverLibp2pPeersLimit
    const bootstrapHttpOnlyPeers = options.bootstrapHttpOnlyPeers ?? defaultOptions.bootstrapHttpOnlyPeers

    libp2p.peerStore.addEventListener('change:protocols', (event) => {
      const { peerId, protocols } = event.detail
      if (protocols.includes(IPFS_GATEWAY_PROTOCOL)) {
        this.newHttpOverLibp2pPeer(peerId)
      }
    })

    this.httpOnlyPeers = [...bootstrapHttpOnlyPeers]
  }

  public newHttpOnlyPeer (url: string): void {
    this.httpOnlyPeers.push(url)
  }

  private newHttpOverLibp2pPeer (peerId: PeerId): void {
    if (this.httpOverLibp2pPeers.length < this.httpOverLibp2pPeersLimit) {
      this.httpOverLibp2pPeers.push({ val: peerId, timestamp: Date.now() })
      return
    }

    let i = 0
    let minTimestamp = this.httpOverLibp2pPeers[0].timestamp
    let minIndex = 0
    for (const { timestamp, val } of this.httpOverLibp2pPeers) {
      if (val === peerId) {
        return // Already have this peer
      }
      if (timestamp < minTimestamp) {
        minTimestamp = timestamp
        minIndex = i
      }
      i++
    }
    this.httpOverLibp2pPeers[minIndex] = { val: peerId, timestamp: Date.now() }
  }

  wantlistForPeer (peerId: PeerId): Map<string, WantListEntry> {
    return this.innerBitswap.wantlistForPeer(peerId)
  }

  ledgerForPeer (peerId: PeerId): Ledger | undefined {
    return this.innerBitswap.ledgerForPeer(peerId)
  }

  unwant (cids: CID<unknown, number, number, Version> | Array<CID<unknown, number, number, Version>>): void {
    this.innerBitswap.unwant(cids)
  }

  cancelWants (cids: CID<unknown, number, number, Version> | Array<CID<unknown, number, number, Version>>): void {
    this.innerBitswap.cancelWants(cids)
  }

  getWantlist (): IterableIterator<[string, WantListEntry]> {
    return this.innerBitswap.getWantlist()
  }

  notify (cid: CID<unknown, number, number, Version>, block: Uint8Array, options?: ProgressOptions<BitswapNetworkNotifyProgressEvents>): void {
    this.innerBitswap.notify(cid, block, options)
  }

  async want (
    cid: CID<unknown, number, number, Version>,
    options?: AbortOptions & ProgressOptions<BitswapWantBlockProgressEvents>
  ): Promise<Uint8Array> {
    // Start a bitswap req
    const abortController = new AbortController()
    if ((options?.signal) != null) {
      options.signal.addEventListener('abort', () => { abortController.abort() })
    }

    let totalReqs = 1 + this.httpOverLibp2pPeers.length + this.httpOnlyPeers.length
    let totalFailures = 0
    const waitForAbortOrAllFailures = async <T>(err: T): Promise<T> => {
      totalFailures++
      if (totalFailures === totalReqs) {
        throw err
      }
      // Wait for the abort so others can provide
      await new Promise((resolve) => { options?.signal?.addEventListener('abort', resolve) })
      return err
    }

    // const bitswapWantPromise = this.innerBitswap.want(cid, { ...options, signal: abortController.signal })
    // .then((block) => {
    //   console.log("Got block from bitswap", Date.now())
    //   return block
    // })
    // .catch(async (err) => {
    //   throw await waitForAbortOrAllFailures(err)
    // })

    // Start a http req over libp2p
    const httpOverLibp2pReqs = this.httpOverLibp2pPeers.map(async ({ val: peerId }) => {
      try {
        const conn = await this.libp2p.dial(peerId, { signal: options?.signal })
        {
          const s = await conn.newStream('/libp2p-http', { signal: options?.signal })
          const fetch = fetchViaDuplex(s)
          const resp: Response = await fetch(new Request(`https://example.com/ipfs/${cid.toString()}/`, { method: 'HEAD', headers: { 'Cache-Control': 'only-if-cached' } }))
          if (!resp.ok) {
          // We don't have the block here, block on the abort signal
            throw new Error('Not found')
          }
        }

        const s = await conn.newStream('/libp2p-http', { signal: options?.signal })
        const fetch = fetchViaDuplex(s)
        const resp: Response = await fetch(new Request(`https://example.com/ipfs/${cid.toString()}/?format=raw`))

        if (resp.ok) {
          const block = new Uint8Array(await resp.arrayBuffer())
          await this.blockstore.put(cid, block)
          console.log("Got block from http over libp2p", Date.now())
          return block
        }
        // Otherwise, do nothing and block on the abort signal
        throw new Error('Not found')
      } catch (err) {
        throw await waitForAbortOrAllFailures(err)
      }
    })

    const httpOnlyReqs = this.httpOnlyPeers.map(async (url) => {
      try {
        {
          // We should be using the Cache-Control header, but this is not a CORS allowed header on some gateways
          // const resp: Response = await fetch(new Request(`${url}/ipfs/${cid.toString()}/`, { method: 'HEAD', headers: { 'Cache-Control': 'only-if-cached' } }), { signal: options?.signal })
          const resp: Response = await fetch(new Request(`${url}/ipfs/${cid.toString()}/`, { method: 'HEAD' }), { signal: options?.signal })
          if (!resp.ok) {
            throw new Error('Not found')
          }
        }

        const resp = await fetch(new Request(`${url}/ipfs/${cid.toString()}/?format=raw`), { signal: options?.signal })
        if (resp.ok) {
          const block = new Uint8Array(await resp.arrayBuffer())
          await this.blockstore.put(cid, block)
          console.log("Got block from http", Date.now())
          return block
        }
        throw new Error('Not found')
      } catch (err) {
        throw await waitForAbortOrAllFailures(err)
      }
    })

    // Wait for the first to finish
    const block = await Promise.race([
      // bitswapWantPromise,
      ...httpOverLibp2pReqs,
      ...httpOnlyReqs
    ])
    this.innerBitswap.notify(cid, block)

    abortController.abort()
    return block
  }

  isStarted (): boolean {
    return this.innerBitswap.isStarted()
  }

  beforeStart? (): void | Promise<void> {
    return this.innerBitswap.beforeStart?.()
  }

  start (): void | Promise<void> {
    return this.innerBitswap.start()
  }

  afterStart? (): void | Promise<void> {
    return this.innerBitswap.afterStart?.()
  }

  beforeStop? (): void | Promise<void> {
    return this.innerBitswap.beforeStop?.()
  }

  stop (): void | Promise<void> {
    return this.innerBitswap.stop()
  }

  afterStop? (): void | Promise<void> {
    return this.innerBitswap.afterStop?.()
  }
}
