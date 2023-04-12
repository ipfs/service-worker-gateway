import { base58btc } from 'multiformats/bases/base58'
import type { CID } from 'multiformats/cid'
import type { Message } from './message.js'
import { WantListEntry } from '../wantlist/entry.js'

export class BitswapMessageEntry {
  public entry: WantListEntry
  public cancel: boolean
  public sendDontHave: boolean

  constructor (cid: CID, priority: number, wantType: Message.Wantlist.WantType, cancel?: boolean, sendDontHave?: boolean) {
    this.entry = new WantListEntry(cid, priority, wantType)
    this.cancel = Boolean(cancel)
    this.sendDontHave = Boolean(sendDontHave)
  }

  get cid (): CID {
    return this.entry.cid
  }

  set cid (cid) {
    this.entry.cid = cid
  }

  get priority (): number {
    return this.entry.priority
  }

  set priority (val) {
    this.entry.priority = val
  }

  get wantType (): Message.Wantlist.WantType {
    return this.entry.wantType
  }

  set wantType (val) {
    this.entry.wantType = val
  }

  get [Symbol.toStringTag] (): string {
    const cidStr = this.cid.toString(base58btc)
    return `BitswapMessageEntry ${cidStr} <cancel: ${this.cancel}, priority: ${this.priority}>`
  }

  equals (other: BitswapMessageEntry): boolean {
    return (this.cancel === other.cancel) &&
           (this.sendDontHave === other.sendDontHave) &&
           (this.wantType === other.wantType) &&
           this.entry.equals(other.entry)
  }
}
