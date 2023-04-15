/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { base32 } from 'multiformats/bases/base32'
import { base64 } from 'multiformats/bases/base64'
import { base58btc } from 'multiformats/bases/base58'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import loadFixture from 'aegir/fixtures'
import { Message } from '../../src/message/message.js'
import { BitswapMessage } from '../../src/message/index.js'
import { makeBlocks } from '../utils/make-blocks.js'
import varintEncoder from '../../src/utils/varint-encoder.js'

const testDataPath = 'test/fixtures/serialized-from-go'
const rawMessageFullWantlist = loadFixture(testDataPath + '/bitswap110-message-full-wantlist')
const rawMessageOneBlock = loadFixture(testDataPath + '/bitswap110-message-one-block')

describe('BitswapMessage', () => {
  let blocks: Array<{ cid: CID, block: Uint8Array }>
  let cids: CID[]

  before(async () => {
    blocks = await makeBlocks(4)
    cids = blocks.map((b) => b.cid)
  })

  describe('.addEntry', () => {
    it('want type defaults to want block', async () => {
      const cid = cids[1]
      const msg = new BitswapMessage(true)
      msg.addEntry(cid, 1)
      const serialized = msg.serializeToBitswap100()

      const deserialized = await BitswapMessage.deserialize(serialized)
      expect(deserialized.wantlist.get(cid.toString(base58btc))).to.have.nested.property('entry.wantType', Message.Wantlist.WantType.Block)
    })

    it('updates priority only if same want type', () => {
      const msg = new BitswapMessage(true)

      msg.addEntry(cids[0], 1, BitswapMessage.WantType.Block, false, false)

      msg.addEntry(cids[0], 2, BitswapMessage.WantType.Have, true, false)
      expect(msg.wantlist.get(cids[0].toString(base58btc))).to.have.property('priority', 1)

      msg.addEntry(cids[0], 2, BitswapMessage.WantType.Block, true, false)
      expect(msg.wantlist.get(cids[0].toString(base58btc))).to.have.property('priority', 2)
    })

    it('only changes from dont cancel to do cancel', () => {
      const msg = new BitswapMessage(true)

      msg.addEntry(cids[0], 1, BitswapMessage.WantType.Block, true, false)
      msg.addEntry(cids[0], 1, BitswapMessage.WantType.Block, false, false)
      expect(msg.wantlist.get(cids[0].toString(base58btc))).to.have.property('cancel', true)

      msg.addEntry(cids[1], 1, BitswapMessage.WantType.Block, false, false)
      msg.addEntry(cids[1], 1, BitswapMessage.WantType.Block, true, false)
      expect(msg.wantlist.get(cids[1].toString(base58btc))).to.have.property('cancel', true)
    })

    it('only changes from dont send to do send DONT_HAVE', () => {
      const msg = new BitswapMessage(true)

      msg.addEntry(cids[0], 1, BitswapMessage.WantType.Block, false, false)
      msg.addEntry(cids[0], 1, BitswapMessage.WantType.Block, false, true)
      expect(msg.wantlist.get(cids[0].toString(base58btc))).to.have.property('sendDontHave', true)

      msg.addEntry(cids[1], 1, BitswapMessage.WantType.Block, false, true)
      msg.addEntry(cids[1], 1, BitswapMessage.WantType.Block, false, false)
      expect(msg.wantlist.get(cids[1].toString(base58btc))).to.have.property('sendDontHave', true)
    })

    it('only override want-have with want-block (not vice versa)', () => {
      const msg = new BitswapMessage(true)

      msg.addEntry(cids[0], 1, BitswapMessage.WantType.Block, false, false)
      msg.addEntry(cids[0], 1, BitswapMessage.WantType.Have, false, false)
      expect(msg.wantlist.get(cids[0].toString(base58btc))).to.have.property('wantType', BitswapMessage.WantType.Block)

      msg.addEntry(cids[1], 1, BitswapMessage.WantType.Have, false, false)
      msg.addEntry(cids[1], 1, BitswapMessage.WantType.Block, false, false)
      expect(msg.wantlist.get(cids[1].toString(base58btc))).to.have.property('wantType', BitswapMessage.WantType.Block)
    })
  })

  it('.serializeToBitswap100', () => {
    const block = blocks[1]
    const msg = new BitswapMessage(true)
    msg.addBlock(block.cid, block.block)
    const serialized = msg.serializeToBitswap100()
    expect(Message.decode(serialized).blocks).to.eql([block.block])
  })

  it('.serializeToBitswap110', () => {
    const block = blocks[1]
    const msg = new BitswapMessage(true)
    msg.addBlock(block.cid, block.block)
    msg.setPendingBytes(10)
    msg.addEntry(cids[0], 10, BitswapMessage.WantType.Have, false, true)
    msg.addHave(cids[1])
    msg.addDontHave(cids[2])

    const serialized = msg.serializeToBitswap110()
    const decoded = Message.decode(serialized)

    expect(decoded.payload[0].data).to.eql(block.block)
    expect(decoded.pendingBytes).to.eql(10)
    expect(decoded).to.have.nested.property('wantlist.entries').with.lengthOf(1)
    expect(decoded).to.have.nested.property('wantlist.entries[0].priority', 10)
    expect(decoded).to.have.nested.property('wantlist.entries[0].wantType', BitswapMessage.WantType.Have)
    expect(decoded).to.have.nested.property('wantlist.entries[0].cancel', false)
    expect(decoded).to.have.nested.property('wantlist.entries[0].sendDontHave', true)
    expect(decoded.blockPresences.length).to.eql(2)
    for (const bp of decoded.blockPresences) {
      if (bp.type === BitswapMessage.BlockPresenceType.Have) {
        expect(bp.cid).to.equalBytes(cids[1].bytes)
      } else {
        expect(bp.cid).to.equalBytes(cids[2].bytes)
      }
    }
  })

  it('.deserialize a Bitswap100 Message', async () => {
    const cid0 = cids[0]
    const cid1 = cids[1]
    const cid2 = cids[2]

    const b1 = blocks[1]
    const b2 = blocks[2]

    const raw = Message.encode({
      wantlist: {
        entries: [{
          block: cid0.bytes,
          cancel: false,
          priority: 0,
          sendDontHave: false,
          wantType: Message.Wantlist.WantType.Block
        }],
        full: true
      },
      blocks: [
        b1.block,
        b2.block
      ]
    })

    const msg = await BitswapMessage.deserialize(raw)
    expect(msg.full).to.equal(true)
    expect(Array.from(msg.wantlist))
      .to.eql([[
        cid0.toString(base58btc),
        new BitswapMessage.Entry(cid0, 0, BitswapMessage.WantType.Block, false)
      ]])

    expect(
      Array.from(msg.blocks).map((b) => [b[0], b[1]])
    ).to.eql([
      [cid1.toString(base58btc), b1.block],
      [cid2.toString(base58btc), b2.block]
    ])
  })

  it('.deserialize a Bitswap110 Message', async () => {
    const cid0 = cids[0]
    const cid1 = cids[1]
    const cid2 = cids[2]
    const cid3 = cids[3]

    const b1 = blocks[1]
    const b2 = blocks[2]

    const raw = Message.encode({
      wantlist: {
        entries: [{
          block: cid0.bytes,
          cancel: false,
          wantType: BitswapMessage.WantType.Block,
          sendDontHave: true,
          priority: 0
        }],
        full: true
      },
      payload: [{
        data: b1.block,
        prefix: varintEncoder([
          cid1.version,
          cid1.code,
          cid1.multihash.code,
          cid1.multihash.digest.length
        ])
      }, {
        data: b2.block,
        prefix: varintEncoder([
          cid2.version,
          cid2.code,
          cid2.multihash.code,
          cid2.multihash.digest.length
        ])
      }],
      blockPresences: [{
        cid: cid3.bytes,
        type: BitswapMessage.BlockPresenceType.Have
      }],
      pendingBytes: 10
    })

    const msg = await BitswapMessage.deserialize(raw)
    expect(msg.full).to.equal(true)
    expect(Array.from(msg.wantlist))
      .to.eql([[
        cid0.toString(base58btc),
        new BitswapMessage.Entry(cid0, 0, BitswapMessage.WantType.Block, false, true)
      ]])

    expect(
      Array.from(msg.blocks).map((b) => [b[0], b[1]])
    ).to.eql([
      [cid1.toString(base58btc), b1.block],
      [cid2.toString(base58btc), b2.block]
    ])

    expect(Array.from(msg.blockPresences))
      .to.eql([[
        cid3.toString(base58btc),
        BitswapMessage.BlockPresenceType.Have
      ]])

    expect(msg.pendingBytes).to.equal(10)
  })

  it('ignores duplicates', () => {
    const b = blocks[0]
    const cid = cids[0]
    const m = new BitswapMessage(true)

    m.addEntry(cid, 1)
    m.addEntry(cid, 1)

    expect(m.wantlist.size).to.be.eql(1)
    m.addBlock(b.cid, b.block)
    m.addBlock(b.cid, b.block)
    expect(m.blocks.size).to.be.eql(1)
  })

  it('.empty', () => {
    const m = new BitswapMessage(true)
    expect(m.empty).to.equal(true)
  })

  it('non-full wantlist message', () => {
    const msg = new BitswapMessage(false)
    const serialized = msg.serializeToBitswap100()

    expect(Message.decode(serialized)).to.have.nested.property('wantlist.full', false)
  })

  describe('.equals', () => {
    it('true, same message', () => {
      const b = blocks[0]
      const cid = cids[0]
      const m1 = new BitswapMessage(true)
      const m2 = new BitswapMessage(true)

      m1.addEntry(cid, 1)
      m2.addEntry(cid, 1)

      m1.addBlock(b.cid, b.block)
      m2.addBlock(b.cid, b.block)
      expect(m1.equals(m2)).to.equal(true)
    })

    it('false, different entries', () => {
      const b = blocks[0]
      const cid = cids[0]
      const m1 = new BitswapMessage(true)
      const m2 = new BitswapMessage(true)

      m1.addEntry(cid, 100)
      m2.addEntry(cid, 3750)

      m1.addBlock(b.cid, b.block)
      m2.addBlock(b.cid, b.block)
      expect(m1.equals(m2)).to.equal(false)
    })

    it('true, same cid derived from distinct encoding', () => {
      const b = blocks[0]
      const cid = cids[0].toV1()
      const cid1 = CID.parse(cid.toString(base32))
      const cid2 = CID.parse(cid.toString(base64), base64)
      const m1 = new BitswapMessage(true)
      const m2 = new BitswapMessage(true)

      m1.addEntry(cid1, 1)
      m2.addEntry(cid2, 1)

      m1.addBlock(b.cid, b.block)
      m2.addBlock(b.cid, b.block)
      expect(m1.equals(m2)).to.equal(true)
    })
  })

  describe('BitswapMessageEntry', () => {
    it('exposes the wantlist entry properties', () => {
      const cid = cids[0]
      const entry = new BitswapMessage.Entry(cid, 5, BitswapMessage.WantType.Block, false, false)

      expect(entry).to.have.property('cid')
      expect(entry).to.have.property('priority', 5)

      expect(entry).to.have.property('wantType', BitswapMessage.WantType.Block)
      expect(entry).to.have.property('cancel', false)
      expect(entry).to.have.property('sendDontHave', false)
    })

    it('allows setting properties on the wantlist entry', () => {
      const cid1 = cids[0]
      const cid2 = cids[1]

      const entry = new BitswapMessage.Entry(cid1, 5, BitswapMessage.WantType.Block, false, false)

      expect(entry.entry).to.have.property('cid')
      expect(entry.entry).to.have.property('priority', 5)

      entry.cid = cid2
      entry.priority = 2

      expect(entry.entry).to.have.property('cid')
      expect(entry.entry.cid.equals(cid2))
      expect(entry.entry).to.have.property('priority', 2)
    })
  })

  describe('go interop', () => {
    it('bitswap 1.0.0 message', async () => {
      const goEncoded = uint8ArrayFromString('CioKKAoiEiAs8k26X7CjDiboOyrFueKeGxYeXB+nQl5zBDNik4uYJBAKGAA=', 'base64pad')

      const msg = new BitswapMessage(false)
      const cid = CID.parse('QmRN6wdp1S2A5EtjW9A3M1vKSBuQQGcgvuhoMUoEz4iiT5')
      msg.addEntry(cid, 10)

      const res = await BitswapMessage.deserialize(goEncoded)
      expect(res).to.eql(msg)

      // TODO: this go bitswap 1.0.0 message was created when the most of the fields were `optional`
      // https://github.com/ipfs/go-libipfs/blob/a43c8829ef499c6ddab4f10d56a7c45738224e7f/bitswap/message/pb/message.proto
      // They've since reverted to being `singular` which means they can be omitted from the buffer
      // if they are set to the default value so compliant protobuf encoders wont produce bytes that
      // match any more.
      // expect(msg.serializeToBitswap100()).to.equalBytes(goEncoded)
    })

    describe.skip('bitswap 1.1.0 message', () => {
      // TODO check with whyrusleeping the quality of the raw protobufs
      // deserialization is just failing on the first and the second has a
      // payload but empty
      it('full wantlist message', async () => {
        await BitswapMessage.deserialize(rawMessageFullWantlist)
        // TODO
        //   check the deserialised message
      })

      it('one block message', async () => {
        await BitswapMessage.deserialize(rawMessageOneBlock)
        // TODO
        //   check the deserialised message
      })
    })
  })
})
