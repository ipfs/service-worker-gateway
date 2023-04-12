import type { PeerId } from '@libp2p/interface-peer-id'
import type { CID } from 'multiformats/cid'
import type { Message } from '../message/message.js'
import type { WantListEntry } from '../wantlist/entry.js'
import { Wantlist } from '../wantlist/index.js'

export class Ledger {
  public partner: PeerId
  public wantlist: Wantlist
  public exchangeCount: number
  public accounting: { bytesSent: number, bytesRecv: number }
  public lastExchange?: number

  constructor (peerId: PeerId) {
    this.partner = peerId
    this.wantlist = new Wantlist()

    this.exchangeCount = 0

    this.accounting = {
      bytesSent: 0,
      bytesRecv: 0
    }
  }

  sentBytes (n: number): void {
    this.exchangeCount++
    this.lastExchange = (new Date()).getTime()
    this.accounting.bytesSent += n
  }

  receivedBytes (n: number): void {
    this.exchangeCount++
    this.lastExchange = (new Date()).getTime()
    this.accounting.bytesRecv += n
  }

  wants (cid: CID, priority: number, wantType: Message.Wantlist.WantType): void {
    this.wantlist.add(cid, priority, wantType)
  }

  /**
   * @param {CID} cid
   * @returns {void}
   */

  cancelWant (cid: CID): void {
    this.wantlist.remove(cid)
  }

  wantlistContains (cid: CID): WantListEntry | undefined {
    return this.wantlist.get(cid)
  }

  debtRatio (): number {
    return (this.accounting.bytesSent / (this.accounting.bytesRecv + 1)) // +1 is to prevent division by zero
  }
}
