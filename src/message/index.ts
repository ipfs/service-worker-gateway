import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
// @ts-expect-error no types
import vd from 'varint-decoder'
import ve from '../utils/varint-encoder.js'
import { isMapEqual } from '../utils/index.js'
import { Message } from './message.js'
import { BitswapMessageEntry as Entry } from './entry.js'
import { CodeError } from '@libp2p/interfaces/errors'
import type { MultihashHasherLoader } from '../index.js'

export class BitswapMessage {
  static Entry = Entry

  static WantType = {
    Block: Message.Wantlist.WantType.Block,
    Have: Message.Wantlist.WantType.Have
  }

  static BlockPresenceType = {
    Have: Message.BlockPresenceType.Have,
    DontHave: Message.BlockPresenceType.DontHave
  }

  static deserialize = async (raw: Uint8Array, hashLoader?: MultihashHasherLoader): Promise<BitswapMessage> => {
    const decoded = Message.decode(raw)

    const isFull = decoded.wantlist?.full === true
    const msg = new BitswapMessage(isFull)

    decoded.wantlist?.entries.forEach((entry) => {
      if (entry.block == null) {
        return
      }
      // note: entry.block is the CID here
      const cid = CID.decode(entry.block)
      msg.addEntry(cid, entry.priority ?? 0, entry.wantType, Boolean(entry.cancel), Boolean(entry.sendDontHave))
    })

    decoded.blockPresences.forEach((blockPresence) => {
      if (blockPresence.cid == null) {
        return
      }

      const cid = CID.decode(blockPresence.cid)

      if (blockPresence.type === BitswapMessage.BlockPresenceType.Have) {
        msg.addHave(cid)
      } else {
        msg.addDontHave(cid)
      }
    })

    // Bitswap 1.0.0
    // decoded.blocks are just the byte arrays
    if (decoded.blocks.length > 0) {
      await Promise.all(decoded.blocks.map(async (b) => {
        const hash = await sha256.digest(b)
        const cid = CID.createV0(hash)
        msg.addBlock(cid, b)
      }))
      return msg
    }

    // Bitswap 1.1.0
    if (decoded.payload.length > 0) {
      await Promise.all(decoded.payload.map(async (p) => {
        if (p.prefix == null || p.data == null) {
          return
        }
        const values = vd(p.prefix)
        const cidVersion = values[0]
        const multicodec = values[1]
        const hashAlg = values[2]
        const hasher = hashAlg === sha256.code ? sha256 : await hashLoader?.getHasher(hashAlg)

        if (hasher == null) {
          throw new CodeError('Unknown hash algorithm', 'ERR_UNKNOWN_HASH_ALG')
        }

        // const hashLen = values[3] // We haven't need to use this so far
        const hash = await hasher.digest(p.data)
        const cid = CID.create(cidVersion, multicodec, hash)
        msg.addBlock(cid, p.data)
      }))
      msg.setPendingBytes(decoded.pendingBytes)
      return msg
    }

    return msg
  }

  static blockPresenceSize = (cid: CID): number => {
    // It's ok if this is not exactly right: it's used to estimate the size of
    // the HAVE / DONT_HAVE on the wire, but when doing that calculation we leave
    // plenty of padding under the maximum message size.
    // (It's more important for this to be fast).
    return cid.bytes.length + 1
  }

  public full: boolean
  public wantlist: Map<string, Entry>
  public blocks: Map<string, Uint8Array>
  public blockPresences: Map<string, Message.BlockPresenceType>
  public pendingBytes: number

  constructor (full: boolean) {
    this.full = full
    this.wantlist = new Map()
    this.blocks = new Map()
    this.blockPresences = new Map()
    this.pendingBytes = 0
  }

  get empty (): boolean {
    return this.blocks.size === 0 &&
           this.wantlist.size === 0 &&
           this.blockPresences.size === 0
  }

  addEntry (cid: CID, priority: number, wantType?: Message.Wantlist.WantType, cancel?: boolean, sendDontHave?: boolean): void {
    if (wantType == null) {
      wantType = BitswapMessage.WantType.Block
    }

    const cidStr = cid.toString(base58btc)
    const entry = this.wantlist.get(cidStr)
    if (entry != null) {
      // Only change priority if want is of the same type
      if (entry.wantType === wantType) {
        entry.priority = priority
      }
      // Only change from "dont cancel" to "do cancel"
      if (cancel === true) {
        entry.cancel = Boolean(cancel)
      }
      // Only change from "dont send" to "do send" DONT_HAVE
      if (sendDontHave === true) {
        entry.sendDontHave = Boolean(sendDontHave)
      }
      // want-block overrides existing want-have
      if (wantType === BitswapMessage.WantType.Block && entry.wantType === BitswapMessage.WantType.Have) {
        entry.wantType = wantType
      }
    } else {
      this.wantlist.set(cidStr, new Entry(cid, priority, wantType, cancel, sendDontHave))
    }
  }

  addBlock (cid: CID, block: Uint8Array): void {
    const cidStr = cid.toString(base58btc)
    this.blocks.set(cidStr, block)
  }

  addHave (cid: CID): void {
    const cidStr = cid.toString(base58btc)
    if (!this.blockPresences.has(cidStr)) {
      this.blockPresences.set(cidStr, BitswapMessage.BlockPresenceType.Have)
    }
  }

  addDontHave (cid: CID): void {
    const cidStr = cid.toString(base58btc)
    if (!this.blockPresences.has(cidStr)) {
      this.blockPresences.set(cidStr, BitswapMessage.BlockPresenceType.DontHave)
    }
  }

  cancel (cid: CID): void {
    const cidStr = cid.toString(base58btc)
    this.wantlist.delete(cidStr)
    this.addEntry(cid, 0, BitswapMessage.WantType.Block, true, false)
  }

  setPendingBytes (size: number): void {
    this.pendingBytes = size
  }

  /**
   * Serializes to Bitswap Message protobuf of
   * version 1.0.0
   */
  serializeToBitswap100 (): Uint8Array {
    return Message.encode({
      wantlist: {
        entries: Array.from(this.wantlist.values()).map((entry) => {
          return {
            block: entry.cid.bytes, // cid
            priority: Number(entry.priority),
            cancel: Boolean(entry.cancel),
            wantType: Message.Wantlist.WantType.Block,
            sendDontHave: false
          }
        }),
        full: Boolean(this.full)
      },
      blocks: Array.from(this.blocks.values())
    })
  }

  /**
   * Serializes to Bitswap Message protobuf of
   * version 1.1.0
   */
  serializeToBitswap110 (): Uint8Array {
    const msg: Message = {
      wantlist: {
        entries: Array.from(this.wantlist.values()).map((entry) => {
          return {
            block: entry.cid.bytes, // cid
            priority: Number(entry.priority),
            wantType: entry.wantType,
            cancel: Boolean(entry.cancel),
            sendDontHave: Boolean(entry.sendDontHave)
          }
        }),
        full: Boolean(this.full)
      },
      blockPresences: [],
      payload: [],
      pendingBytes: this.pendingBytes,
      blocks: []
    }

    for (const [cidStr, data] of this.blocks.entries()) {
      const cid = CID.parse(cidStr)
      const version = cid.version
      const codec = cid.code
      const multihash = cid.multihash.code
      const digestLength = cid.multihash.digest.length
      const prefix = ve([
        version, codec, multihash, digestLength
      ])

      msg.payload.push({
        prefix,
        data
      })
    }

    for (const [cidStr, bpType] of this.blockPresences) {
      msg.blockPresences.push({
        cid: CID.parse(cidStr).bytes,
        type: bpType
      })
    }

    if (this.pendingBytes > 0) {
      msg.pendingBytes = this.pendingBytes
    }

    return Message.encode(msg)
  }

  equals (other: BitswapMessage): boolean {
    if (this.full !== other.full ||
        this.pendingBytes !== other.pendingBytes ||
        !isMapEqual(this.wantlist, other.wantlist) ||
        !isMapEqual(this.blocks, other.blocks) ||
        // @TODO - Is this a bug ?
        // @ts-expect-error - isMap equals map values to be objects not numbers
        !isMapEqual(this.blockPresences, other.blockPresences)
    ) {
      return false
    }

    return true
  }

  get [Symbol.toStringTag] (): string {
    const list = Array.from(this.wantlist.keys())
    const blocks = Array.from(this.blocks.keys())
    return `BitswapMessage <full: ${this.full}, list: ${list}, blocks: ${blocks}>`
  }
}
