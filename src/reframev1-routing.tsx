import { logger } from '@libp2p/logger'
import PQueue from 'p-queue'
import defer from 'p-defer'
import errCode from 'err-code'
import anySignal from 'any-signal'
import type { AbortOptions } from '@libp2p/interfaces'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { Startable } from '@libp2p/interfaces/startable'
import type { CID } from 'multiformats/cid'
import HTTP from 'ipfs-utils/src/http.js'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:delegated-content-routing')

const DEFAULT_TIMEOUT = 30e3 // 30 second default
const CONCURRENT_HTTP_REQUESTS = 4

export interface HTTPClientExtraOptions {
  headers?: Record<string, string>
  searchParams?: URLSearchParams
}

/**
 * An implementation of content routing, using a delegated peer
 */
class ReframeV1Routing implements ContentRouting, Startable {
  private readonly clientUrl: URL

  private readonly httpQueue: PQueue
  private started: boolean
  private abortController: AbortController

  /**
   * Create a new DelegatedContentRouting instance
   */
  constructor (protocol: string, host: string, port: string) {
    this.started = false
    this.abortController = new AbortController()

    // limit concurrency to avoid request flood in web browser
    // https://github.com/libp2p/js-libp2p-delegated-content-routing/issues/12
    this.httpQueue = new PQueue({
      concurrency: CONCURRENT_HTTP_REQUESTS
    })

    log(`enabled IPNI routing via ${protocol}://${host}:${port}`)
    this.clientUrl = new URL(`${protocol}://${host}:${port}`)
  }

  isStarted (): boolean {
    return this.started
  }

  start (): void {
    this.started = true
  }

  stop (): void {
    this.httpQueue.clear()
    this.abortController.abort()
    this.abortController = new AbortController()
    this.started = false
  }

  /**
   * Search the dht for providers of the given CID.
   *
   * - call `findProviders` on the delegated node.
   */
  async * findProviders (key: CID, options: HTTPClientExtraOptions & AbortOptions = {}): AsyncIterable<PeerInfo> {
    log('findProviders starts: %c', key)
    options.signal = anySignal([this.abortController.signal].concat((options.signal != null) ? [options.signal] : []))
    setTimeout(() => {
      this.abortController.abort("findProviders timed out")
    }, DEFAULT_TIMEOUT);

    const onStart = defer()
    const onFinish = defer()

    void this.httpQueue.add(async () => {
      onStart.resolve()
      return await onFinish.promise
    })

    try {
      await onStart.promise

      const resource = `${this.clientUrl}routing/v1/providers/${key.toString()}`
      const getOptions = { headers : { "Accept" : "application/x-ndjson"}, signal : this.abortController.signal}
      const a = await HTTP.get(resource, getOptions)
      const b = a.ndjson()
      for await (const event of b) {
        if (event.Protocol != "transport-bitswap" || event.Schema != "bitswap") {
          continue
        }
        
        console.log(event)
        yield this.mapEvent(event)
      }
    } catch (err) {
      log.error('findProviders errored:', err)
      throw err
    } finally {
      onFinish.resolve()
      log('findProviders finished: %c', key)
    }
  }

mapEvent (event: any) : any {
    const peer = peerIdFromString(event.ID)
    let ma : any = []
    for (const strAddr of event.Addrs) {
        const addr = multiaddr(strAddr)
        ma.push(addr)
    }
    const pi = {
        id: peer,
        multiaddrs: ma
    }
    return pi
}

  /**
   * Does nothing, just part of implementing the interface
   */
  async provide (key: CID, options: HTTPClientExtraOptions & AbortOptions = {}): Promise<void> {
  }

  /**
   * Does nothing, just part of implementing the interface
   */
  async put (key: Uint8Array, value: Uint8Array, options: HTTPClientExtraOptions & AbortOptions = {}): Promise<void> {
  }

  /**
   * Does nothing, just part of implementing the interface
   */
  async get (key: Uint8Array, options: HTTPClientExtraOptions & AbortOptions = {}): Promise<Uint8Array> {
    throw errCode(new Error('Not found'), 'ERR_NOT_FOUND')
  }
}

export function reframeV1Routing (protocol :string, host: string, port: string): (components?: any) => ContentRouting {
  return () => new ReframeV1Routing(protocol, host, port)
}