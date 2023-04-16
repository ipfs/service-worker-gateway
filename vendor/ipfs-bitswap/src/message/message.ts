/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { enumeration, encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Codec } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Message {
  wantlist?: Message.Wantlist
  blocks: Uint8Array[]
  payload: Message.Block[]
  blockPresences: Message.BlockPresence[]
  pendingBytes: number
}

export namespace Message {
  export interface Wantlist {
    entries: Message.Wantlist.Entry[]
    full: boolean
  }

  export namespace Wantlist {
    export enum WantType {
      Block = 'Block',
      Have = 'Have'
    }

    enum __WantTypeValues {
      Block = 0,
      Have = 1
    }

    export namespace WantType {
      export const codec = (): Codec<WantType> => {
        return enumeration<WantType>(__WantTypeValues)
      }
    }

    export interface Entry {
      block: Uint8Array
      priority: number
      cancel: boolean
      wantType: Message.Wantlist.WantType
      sendDontHave: boolean
    }

    export namespace Entry {
      let _codec: Codec<Entry>

      export const codec = (): Codec<Entry> => {
        if (_codec == null) {
          _codec = message<Entry>((obj, w, opts = {}) => {
            if (opts.lengthDelimited !== false) {
              w.fork()
            }

            if ((obj.block != null && obj.block.byteLength > 0)) {
              w.uint32(10)
              w.bytes(obj.block)
            }

            if ((obj.priority != null && obj.priority !== 0)) {
              w.uint32(16)
              w.int32(obj.priority)
            }

            if ((obj.cancel != null && obj.cancel !== false)) {
              w.uint32(24)
              w.bool(obj.cancel)
            }

            if (obj.wantType != null && __WantTypeValues[obj.wantType] !== 0) {
              w.uint32(32)
              Message.Wantlist.WantType.codec().encode(obj.wantType, w)
            }

            if ((obj.sendDontHave != null && obj.sendDontHave !== false)) {
              w.uint32(40)
              w.bool(obj.sendDontHave)
            }

            if (opts.lengthDelimited !== false) {
              w.ldelim()
            }
          }, (reader, length) => {
            const obj: any = {
              block: new Uint8Array(0),
              priority: 0,
              cancel: false,
              wantType: WantType.Block,
              sendDontHave: false
            }

            const end = length == null ? reader.len : reader.pos + length

            while (reader.pos < end) {
              const tag = reader.uint32()

              switch (tag >>> 3) {
                case 1:
                  obj.block = reader.bytes()
                  break
                case 2:
                  obj.priority = reader.int32()
                  break
                case 3:
                  obj.cancel = reader.bool()
                  break
                case 4:
                  obj.wantType = Message.Wantlist.WantType.codec().decode(reader)
                  break
                case 5:
                  obj.sendDontHave = reader.bool()
                  break
                default:
                  reader.skipType(tag & 7)
                  break
              }
            }

            return obj
          })
        }

        return _codec
      }

      export const encode = (obj: Partial<Entry>): Uint8Array => {
        return encodeMessage(obj, Entry.codec())
      }

      export const decode = (buf: Uint8Array | Uint8ArrayList): Entry => {
        return decodeMessage(buf, Entry.codec())
      }
    }

    let _codec: Codec<Wantlist>

    export const codec = (): Codec<Wantlist> => {
      if (_codec == null) {
        _codec = message<Wantlist>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.entries != null) {
            for (const value of obj.entries) {
              w.uint32(10)
              Message.Wantlist.Entry.codec().encode(value, w)
            }
          }

          if ((obj.full != null && obj.full !== false)) {
            w.uint32(16)
            w.bool(obj.full)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length) => {
          const obj: any = {
            entries: [],
            full: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1:
                obj.entries.push(Message.Wantlist.Entry.codec().decode(reader, reader.uint32()))
                break
              case 2:
                obj.full = reader.bool()
                break
              default:
                reader.skipType(tag & 7)
                break
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<Wantlist>): Uint8Array => {
      return encodeMessage(obj, Wantlist.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList): Wantlist => {
      return decodeMessage(buf, Wantlist.codec())
    }
  }

  export interface Block {
    prefix: Uint8Array
    data: Uint8Array
  }

  export namespace Block {
    let _codec: Codec<Block>

    export const codec = (): Codec<Block> => {
      if (_codec == null) {
        _codec = message<Block>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.prefix != null && obj.prefix.byteLength > 0)) {
            w.uint32(10)
            w.bytes(obj.prefix)
          }

          if ((obj.data != null && obj.data.byteLength > 0)) {
            w.uint32(18)
            w.bytes(obj.data)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length) => {
          const obj: any = {
            prefix: new Uint8Array(0),
            data: new Uint8Array(0)
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1:
                obj.prefix = reader.bytes()
                break
              case 2:
                obj.data = reader.bytes()
                break
              default:
                reader.skipType(tag & 7)
                break
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<Block>): Uint8Array => {
      return encodeMessage(obj, Block.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList): Block => {
      return decodeMessage(buf, Block.codec())
    }
  }

  export enum BlockPresenceType {
    Have = 'Have',
    DontHave = 'DontHave'
  }

  enum __BlockPresenceTypeValues {
    Have = 0,
    DontHave = 1
  }

  export namespace BlockPresenceType {
    export const codec = (): Codec<BlockPresenceType> => {
      return enumeration<BlockPresenceType>(__BlockPresenceTypeValues)
    }
  }

  export interface BlockPresence {
    cid: Uint8Array
    type: Message.BlockPresenceType
  }

  export namespace BlockPresence {
    let _codec: Codec<BlockPresence>

    export const codec = (): Codec<BlockPresence> => {
      if (_codec == null) {
        _codec = message<BlockPresence>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.cid != null && obj.cid.byteLength > 0)) {
            w.uint32(10)
            w.bytes(obj.cid)
          }

          if (obj.type != null && __BlockPresenceTypeValues[obj.type] !== 0) {
            w.uint32(16)
            Message.BlockPresenceType.codec().encode(obj.type, w)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length) => {
          const obj: any = {
            cid: new Uint8Array(0),
            type: BlockPresenceType.Have
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1:
                obj.cid = reader.bytes()
                break
              case 2:
                obj.type = Message.BlockPresenceType.codec().decode(reader)
                break
              default:
                reader.skipType(tag & 7)
                break
            }
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: Partial<BlockPresence>): Uint8Array => {
      return encodeMessage(obj, BlockPresence.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList): BlockPresence => {
      return decodeMessage(buf, BlockPresence.codec())
    }
  }

  let _codec: Codec<Message>

  export const codec = (): Codec<Message> => {
    if (_codec == null) {
      _codec = message<Message>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.wantlist != null) {
          w.uint32(10)
          Message.Wantlist.codec().encode(obj.wantlist, w)
        }

        if (obj.blocks != null) {
          for (const value of obj.blocks) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (obj.payload != null) {
          for (const value of obj.payload) {
            w.uint32(26)
            Message.Block.codec().encode(value, w)
          }
        }

        if (obj.blockPresences != null) {
          for (const value of obj.blockPresences) {
            w.uint32(34)
            Message.BlockPresence.codec().encode(value, w)
          }
        }

        if ((obj.pendingBytes != null && obj.pendingBytes !== 0)) {
          w.uint32(40)
          w.int32(obj.pendingBytes)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          blocks: [],
          payload: [],
          blockPresences: [],
          pendingBytes: 0
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.wantlist = Message.Wantlist.codec().decode(reader, reader.uint32())
              break
            case 2:
              obj.blocks.push(reader.bytes())
              break
            case 3:
              obj.payload.push(Message.Block.codec().decode(reader, reader.uint32()))
              break
            case 4:
              obj.blockPresences.push(Message.BlockPresence.codec().decode(reader, reader.uint32()))
              break
            case 5:
              obj.pendingBytes = reader.int32()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<Message>): Uint8Array => {
    return encodeMessage(obj, Message.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Message => {
    return decodeMessage(buf, Message.codec())
  }
}
