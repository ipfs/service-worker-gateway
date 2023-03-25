import PQueue from 'p-queue'
import errCode from 'err-code'
import type { AbortOptions } from '@libp2p/interfaces'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { Startable } from '@libp2p/interfaces/startable'
import type { CID } from 'multiformats/cid'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'

import type { CustomRoutingEventType, HTTPClientExtraOptions, Multiaddr } from './types.ts'

/**
 * An implementation of content routing, using a delegated peer
 */
export class CustomRouting<T extends CustomRoutingEventType> implements ContentRouting, Startable {
  protected readonly DEFAULT_TIMEOUT = 30e3 // 30 second default
  protected readonly CONCURRENT_HTTP_REQUESTS = 4
  protected readonly clientUrl: URL

  protected readonly httpQueue: PQueue
  public started: boolean
  protected abortController: AbortController

  constructor (protocol: string, host: string, port: string) {
    this.started = false
    this.abortController = new AbortController()

    // limit concurrency to avoid request flood in web browser
    // https://github.com/libp2p/js-libp2p-delegated-content-routing/issues/12
    this.httpQueue = new PQueue({
      concurrency: this.CONCURRENT_HTTP_REQUESTS
    })
    this.clientUrl = new URL(`${protocol}://${host}:${port}`)
  }

  findProviders (cid: CID, options?: AbortOptions): AsyncIterable<PeerInfo> {
    throw new Error('Method not implemented.')
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
   * To be implemented by the subclass, helps return proper peerId from events that may be different shapes
   */
  getPeerIdFromEvent (event: T): string {
    throw new Error('getPeerIdFromEvent not implemented.')
  }

  /**
   * To be implemented by the subclass, helps return MultiAddrs from events that may be different shapes
   */
  getMultiaddrsFromEvent (event: T): Multiaddr[] {
    throw new Error('getMultiaddrsFromEvent not implemented.')
  }

  mapEvent (event: T): PeerInfo {
    console.log('event: ', event)
    const peer = peerIdFromString(this.getPeerIdFromEvent(event))
    const ma: Multiaddr[] = []
    for (const strAddr of this.getMultiaddrsFromEvent(event)) {
      const addr = multiaddr(strAddr)
      ma.push(addr)
    }
    const pi = {
      id: peer,
      multiaddrs: ma,
      protocols: [] // TODO: what should this be?
    }
    return pi
  }

  /**
   * Does nothing, just part of implementing the interface
   */
  async provide (key: CID, options: HTTPClientExtraOptions & AbortOptions = {}): Promise<void> {
    // noop
  }

  /**
   * Does nothing, just part of implementing the interface
   */
  async put (key: Uint8Array, value: Uint8Array, options: HTTPClientExtraOptions & AbortOptions = {}): Promise<void> {
    // noop
  }

  /**
   * Does nothing, just part of implementing the interface
   */
  async get (key: Uint8Array, options: HTTPClientExtraOptions & AbortOptions = {}): Promise<Uint8Array> {
    throw errCode(new Error('Not found'), 'ERR_NOT_FOUND')
  }
}
