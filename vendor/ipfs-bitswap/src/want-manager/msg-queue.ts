import debounce from 'just-debounce-it'
import { BitswapMessage as Message } from '../message/index.js'
import { logger } from '../utils/index.js'
import { wantlistSendDebounceMs } from '../constants.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { BitswapNetworkWantProgressEvents, Network } from '../network.js'
import type { CID } from 'multiformats/cid'
import type { Logger } from '@libp2p/logger'
import type { ProgressOptions } from 'progress-events'
import type { BitswapWantBlockProgressEvents } from '../index.js'

export class MsgQueue {
  public peerId: PeerId
  public refcnt: number
  private readonly network: Network
  private _entries: Array<{ cid: CID, priority: number, cancel?: boolean }>
  private readonly _log: Logger

  constructor (selfPeerId: PeerId, otherPeerId: PeerId, network: Network) {
    this.peerId = otherPeerId
    this.network = network
    this.refcnt = 1
    this._entries = []
    this._log = logger(selfPeerId, 'msgqueue')
    this.sendEntries = debounce(this.sendEntries.bind(this), wantlistSendDebounceMs)
  }

  addMessage (msg: Message, options: ProgressOptions<BitswapNetworkWantProgressEvents> = {}): void {
    if (msg.empty) {
      return
    }

    void this.send(msg, options)
  }

  addEntries (entries: Array<{ cid: CID, priority: number }>, options: ProgressOptions<BitswapWantBlockProgressEvents> = {}): void {
    this._entries = this._entries.concat(entries)
    this.sendEntries(options)
  }

  sendEntries (options: ProgressOptions<BitswapWantBlockProgressEvents> = {}): void {
    if (this._entries.length === 0) {
      return
    }

    const msg = new Message(false)
    this._entries.forEach((entry) => {
      if (entry.cancel === true) {
        msg.cancel(entry.cid)
      } else {
        msg.addEntry(entry.cid, entry.priority)
      }
    })
    this._entries = []
    this.addMessage(msg, options)
  }

  async send (msg: Message, options: ProgressOptions<BitswapNetworkWantProgressEvents> = {}): Promise<void> {
    try {
      await this.network.connectTo(this.peerId, options)
    } catch (err: any) {
      this._log.error('cant connect to peer %p: %s', this.peerId, err.message)
      return
    }

    this._log('sending message to peer %p', this.peerId)

    // Note: Don't wait for sendMessage() to complete
    this.network.sendMessage(this.peerId, msg, options).catch((err) => {
      this._log.error('send error', err)
    })
  }
}
