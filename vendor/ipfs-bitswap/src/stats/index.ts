import { EventEmitter } from 'events'
import { Stat } from './stat.js'
import { trackedMap } from '@libp2p/tracked-map'
import type { Libp2p } from 'libp2p'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { IMovingAverage } from '@vascosantos/moving-average'

/**
 * @typedef {import('multiformats').CID} CID
 * @typedef {import('@libp2p/interface-peer-id').PeerId} PeerId
 */

export interface StatsOptions {
  enabled?: boolean
  computeThrottleTimeout?: number
  computeThrottleMaxQueueSize?: number
  movingAverageIntervals?: number[]
}

const defaultOptions: Required<StatsOptions> = {
  enabled: false,
  computeThrottleTimeout: 1000,
  computeThrottleMaxQueueSize: 1000,
  movingAverageIntervals: [
    60 * 1000, // 1 minute
    5 * 60 * 1000, // 5 minutes
    15 * 60 * 1000 // 15 minutes
  ]
}

export class Stats extends EventEmitter {
  private readonly _initialCounters: string[]
  private readonly _options: Required<StatsOptions>
  private _enabled: boolean
  private readonly _global: Stat
  private readonly _peers: Map<string, Stat>

  constructor (libp2p: Libp2p, initialCounters: string[] = [], _options: StatsOptions = defaultOptions) {
    super()

    const options = Object.assign({}, defaultOptions, _options)

    if (typeof options.computeThrottleTimeout !== 'number') {
      throw new Error('need computeThrottleTimeout')
    }

    if (typeof options.computeThrottleMaxQueueSize !== 'number') {
      throw new Error('need computeThrottleMaxQueueSize')
    }

    this._initialCounters = initialCounters
    this._options = options
    this._enabled = this._options.enabled

    this._global = new Stat(initialCounters, options)
    this._global.on('update', (stats) => this.emit('update', stats))

    this._peers = trackedMap({
      name: 'ipfs_bitswap_stats_peers',
      metrics: libp2p.metrics
    })
  }

  enable (): void {
    this._enabled = true
    this._options.enabled = true
    this._global.enable()
  }

  disable (): void {
    this._enabled = false
    this._options.enabled = false
    this._global.disable()
  }

  stop (): void {
    this._enabled = false
    this._global.stop()
    for (const peerStat of this._peers) {
      peerStat[1].stop()
    }
  }

  get snapshot (): Record<string, bigint> {
    return this._global.snapshot
  }

  get movingAverages (): Record<string, Record<number, IMovingAverage>> {
    return this._global.movingAverages
  }

  forPeer (peerId: PeerId | string): Stat | undefined {
    const peerIdStr = peerId.toString()

    return this._peers.get(peerIdStr)
  }

  push (peer: string | undefined, counter: string, inc: number): void {
    if (this._enabled) {
      this._global.push(counter, inc)

      if (peer != null) {
        let peerStats = this._peers.get(peer)
        if (peerStats == null) {
          peerStats = new Stat(this._initialCounters, this._options)
          this._peers.set(peer, peerStats)
        }

        peerStats.push(counter, inc)
      }
    }
  }

  disconnected (peer: PeerId): void {
    const peerId = peer.toString()
    const peerStats = this._peers.get(peerId)
    if (peerStats != null) {
      peerStats.stop()
      this._peers.delete(peerId)
    }
  }
}
