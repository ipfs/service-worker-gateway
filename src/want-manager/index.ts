
import { BitswapMessage as Message } from '../message/index.js'
import { Wantlist } from '../wantlist/index.js'
import * as CONSTANTS from '../constants.js'
import { MsgQueue } from './msg-queue.js'
import { logger } from '../utils/index.js'
import { base58btc } from 'multiformats/bases/base58'
import { trackedMap } from '@libp2p/tracked-map'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Network } from '../network.js'
import type { Stats } from '../stats/index.js'
import type { Libp2p } from '@libp2p/interface-libp2p'
import type { Logger } from '@libp2p/logger'
import type { CID } from 'multiformats/cid'
import type { AbortOptions } from '@multiformats/multiaddr'
import type { ProgressOptions } from 'progress-events'
import type { BitswapWantBlockProgressEvents } from '../index.js'

export class WantManager {
  private readonly peers: Map<string, MsgQueue>
  public wantlist: Wantlist
  public network: Network
  private readonly _peerId: PeerId
  private readonly _log: Logger

  constructor (peerId: PeerId, network: Network, stats: Stats, libp2p: Libp2p) {
    this.peers = trackedMap({
      name: 'ipfs_bitswap_want_manager_peers',
      metrics: libp2p.metrics
    })
    this.wantlist = new Wantlist(stats, libp2p)
    this.network = network
    this._peerId = peerId
    this._log = logger(peerId, 'want')
  }

  _addEntries (cids: CID[], cancel: boolean, force?: boolean, options: ProgressOptions<BitswapWantBlockProgressEvents> = {}): void {
    const entries = cids.map((cid, i) => {
      return new Message.Entry(cid, CONSTANTS.kMaxPriority - i, Message.WantType.Block, cancel)
    })

    entries.forEach((e) => {
      // add changes to our wantlist
      if (e.cancel) {
        if (force === true) {
          this.wantlist.removeForce(e.cid.toString(base58btc))
        } else {
          this.wantlist.remove(e.cid)
        }
      } else {
        this._log('adding to wantlist')
        // TODO: Figure out the wantType
        // @ts-expect-error - requires wantType
        this.wantlist.add(e.cid, e.priority)
      }
    })

    // broadcast changes
    for (const p of this.peers.values()) {
      p.addEntries(entries, options)
    }
  }

  _startPeerHandler (peerId: PeerId): MsgQueue | undefined {
    let mq = this.peers.get(peerId.toString())

    if (mq != null) {
      mq.refcnt++
      return
    }

    mq = new MsgQueue(this._peerId, peerId, this.network)

    // new peer, give them the full wantlist
    const fullwantlist = new Message(true)

    for (const entry of this.wantlist.entries()) {
      fullwantlist.addEntry(entry[1].cid, entry[1].priority)
    }

    mq.addMessage(fullwantlist)

    this.peers.set(peerId.toString(), mq)
    return mq
  }

  _stopPeerHandler (peerId: PeerId): void {
    const mq = this.peers.get(peerId.toString())

    if (mq == null) {
      return
    }

    mq.refcnt--
    if (mq.refcnt > 0) {
      return
    }

    this.peers.delete(peerId.toString())
  }

  /**
   * add all the cids to the wantlist
   */
  wantBlocks (cids: CID[], options: AbortOptions & ProgressOptions<BitswapWantBlockProgressEvents> = {}): void {
    this._addEntries(cids, false, false, options)

    options.signal?.addEventListener('abort', () => {
      this.cancelWants(cids)
    })
  }

  /**
   * Remove blocks of all the given keys without respecting refcounts
   */
  unwantBlocks (cids: CID[]): void {
    this._log('unwant blocks: %s', cids.length)
    this._addEntries(cids, true, true)
  }

  /**
   * Cancel wanting all of the given keys
   */
  cancelWants (cids: CID[]): void {
    this._log('cancel wants: %s', cids.length)
    this._addEntries(cids, true)
  }

  /**
   * Returns a list of all currently connected peers
   */
  connectedPeers (): string[] {
    return Array.from(this.peers.keys())
  }

  connected (peerId: PeerId): void {
    this._startPeerHandler(peerId)
  }

  disconnected (peerId: PeerId): void {
    this._stopPeerHandler(peerId)
  }

  start (): void {
  }

  stop (): void {
    this.peers.forEach((mq) => { this.disconnected(mq.peerId) })
  }
}
