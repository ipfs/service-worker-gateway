
import { base58btc } from 'multiformats/bases/base58'
import type { CID } from 'multiformats/cid'
import type { Message } from '../message/message'

export class WantListEntry {
  private _refCounter: number
  public cid: CID
  public priority: number
  public wantType: Message.Wantlist.WantType

  constructor (cid: CID, priority: number, wantType: Message.Wantlist.WantType) {
    // Keep track of how many requests we have for this key
    this._refCounter = 1

    this.cid = cid
    this.priority = priority ?? 1
    this.wantType = wantType
  }

  inc (): void {
    this._refCounter += 1
  }

  dec (): void {
    this._refCounter = Math.max(0, this._refCounter - 1)
  }

  hasRefs (): boolean {
    return this._refCounter > 0
  }

  // So that console.log prints a nice description of this object
  get [Symbol.toStringTag] (): string {
    const cidStr = this.cid.toString(base58btc)
    return `WantlistEntry <key: ${cidStr}, priority: ${this.priority}, refs: ${this._refCounter}>`
  }

  equals (other: any): boolean {
    return (this._refCounter === other._refCounter) &&
      this.cid.equals(other.cid) &&
      this.priority === other.priority &&
      this.wantType === other.wantType
  }
}
