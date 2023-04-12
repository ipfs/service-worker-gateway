/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { expect } from 'aegir/chai'
import drain from 'it-drain'
import { BitswapMessage as Message } from '../src/message/index.js'
import { DefaultBitswap } from '../src/bitswap.js'
import { CID } from 'multiformats/cid'
import delay from 'delay'
import { base58btc } from 'multiformats/bases/base58'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { isPeerId, PeerId } from '@libp2p/interface-peer-id'
import { MemoryBlockstore } from 'blockstore-core/memory'
import {
  mockNetwork,
  applyNetwork,
  mockLibp2pNode
} from './utils/mocks.js'
import { storeHasBlocks } from './utils/store-has-blocks.js'
import { makeBlocks } from './utils/make-blocks.js'
import { makePeerIds } from './utils/make-peer-id.js'
import { orderedFinish } from './utils/helpers.js'
import type { Blockstore } from 'interface-blockstore'
import type { Network } from '../src/network.js'
import type { Bitswap } from '../src/index.js'

const DAG_PB_CODEC = 0x70
const RAW_CODEC = 0x50

function wantsBlock (cid: CID, bitswap: Bitswap): boolean {
  for (const [, value] of bitswap.getWantlist()) {
    if (value.cid.equals(cid)) {
      return true
    }
  }

  return false
}

describe('bitswap with mocks', function () {
  this.timeout(10 * 1000)

  let blockstore: Blockstore
  let blocks: Array<{ cid: CID, block: Uint8Array }>
  let ids: PeerId[]

  before(async () => {
    blockstore = new MemoryBlockstore()
    blocks = await makeBlocks(15)
    ids = await makePeerIds(2)
  })

  describe('receive message', () => {
    it('simple block message', async () => {
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)
      await bs.start()

      const other = ids[1]

      const b1 = blocks[0]
      const b2 = blocks[1]

      bs.wm.wantBlocks([b1.cid, b2.cid])

      const msg = new Message(false)
      msg.addBlock(b1.cid, b1.block)
      msg.addBlock(b2.cid, b2.block)

      await bs._receiveMessage(other, msg)

      const blks = await Promise.all([
        b1.cid, b2.cid
      ].map(async (cid) => await blockstore.get(cid)))

      expect(blks[0]).to.eql(b1.block)
      expect(blks[1]).to.eql(b2.block)

      const ledger = bs.ledgerForPeer(other)

      if (ledger == null) {
        throw new Error('No ledger found for peer')
      }

      expect(ledger.peer.toString()).to.equal(other.toString())
      expect(ledger.value).to.equal(0)
      expect(ledger.sent).to.equal(0)
      expect(ledger.recv).to.equal(96)
      expect(ledger.exchanged).to.equal(2)

      await bs.stop()
    })

    it('simple want message', async () => {
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)
      await bs.start()

      const other = ids[1]
      const b1 = blocks[0]
      const b2 = blocks[1]

      const msg = new Message(false)

      msg.addEntry(b1.cid, 1)
      msg.addEntry(b2.cid, 1)

      await bs._receiveMessage(other, msg)

      const wl = bs.wantlistForPeer(other)

      expect(wl.has(b1.cid.toString(base58btc))).to.eql(true)
      expect(wl.has(b2.cid.toString(base58btc))).to.eql(true)

      await bs.stop()
    })

    it('multi peer', async function () {
      this.timeout(80 * 1000)
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)

      await bs.start()

      const others = await makePeerIds(5)
      const blocks = await makeBlocks(10)

      const messages = await Promise.all(new Array(5).fill(0).map((_, i) => {
        const msg = new Message(false)
        msg.addBlock(blocks[i].cid, blocks[i].block)
        msg.addBlock(blocks[i + 5].cid, blocks[i + 5].block)
        return msg
      }))

      let i = 0
      for (const other of others) {
        const msg = messages[i]
        i++

        const cids = [...msg.blocks.keys()].map(k => CID.parse(k))
        bs.wm.wantBlocks(cids)

        await bs._receiveMessage(other, msg)
        await storeHasBlocks(msg, blockstore)
      }

      await bs.stop()
    })

    it('ignore unwanted blocks', async () => {
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)
      await bs.start()

      const other = ids[1]

      const b1 = blocks[2]
      const b2 = blocks[3]
      const b3 = blocks[4]

      bs.wm.wantBlocks([b2.cid])

      const msg = new Message(false)
      msg.addBlock(b1.cid, b1.block)
      msg.addBlock(b2.cid, b2.block)
      msg.addBlock(b3.cid, b3.block)

      await bs._receiveMessage(other, msg)

      const res = await Promise.all(
        [b1.cid, b2.cid, b3.cid]
          .map(async (cid) => {
            try {
              await blockstore.get(cid)
              return true
            } catch {
              return false
            }
          }
          )
      )
      expect(res).to.eql([false, true, false])

      const ledger = bs.ledgerForPeer(other)

      if (ledger == null) {
        throw new Error('No ledger found for peer')
      }

      expect(ledger.peer.toString()).to.equal(other.toString())
      expect(ledger.value).to.equal(0)

      // Note: Keeping track of received bytes for blocks affects the
      // debt ratio, which in future may be used as part of fairness
      // algorithms when prioritizing who to send blocks to.
      // So we may want to revise whether we record received blocks from
      // a peer even if we didn't ask for the blocks.
      // For now keeping it liks this to match the go implementation:
      // https://github.com/ipfs/go-bitswap/blob/acc22c283722c15436120ae522c8e8021d0b06f8/bitswap.go#L293
      expect(ledger.sent).to.equal(0)
      expect(ledger.recv).to.equal(144)
      expect(ledger.exchanged).to.equal(3)

      await bs.stop()
    })
  })

  describe('get', () => {
    it('fails on requesting empty block', async () => {
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)
      try {
        // @ts-expect-error we want this to fail
        await bs.want(null)
      } catch (err: any) {
        expect(err).to.exist()
        expect(err.message).to.equal('Not a valid cid')
      }
    })

    it('block exists locally', async () => {
      const block = blocks[4]
      await blockstore.put(block.cid, block.block)
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)

      expect(await bs.want(block.cid)).to.equalBytes(block.block)
    })

    it('blocks exist locally', async () => {
      const b1 = blocks[3]
      const b2 = blocks[14]
      const b3 = blocks[13]

      await drain(blockstore.putMany([{ cid: b1.cid, block: b1.block }, { cid: b2.cid, block: b2.block }, { cid: b3.cid, block: b3.block }]))
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)

      const retrievedBlocks = await Promise.all(
        [b1.cid, b2.cid, b3.cid].map(async cid => await bs.want(cid))
      )

      expect(retrievedBlocks).to.be.eql([b1.block, b2.block, b3.block])
    })

    it('getMany', async () => {
      const b1 = blocks[5]
      const b2 = blocks[6]
      const b3 = blocks[7]

      await drain(blockstore.putMany([{ cid: b1.cid, block: b1.block }, { cid: b2.cid, block: b2.block }, { cid: b3.cid, block: b3.block }]))
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)

      const block1 = await bs.want(b1.cid)
      expect(block1).to.equalBytes(b1.block)

      const block2 = await bs.want(b2.cid)
      expect(block2).to.equalBytes(b2.block)

      const block3 = await bs.want(b3.cid)
      expect(block3).to.equalBytes(b3.block)
    })

    it('block is added locally afterwards', async () => {
      const finish = orderedFinish(2)
      const block = blocks[9]
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)
      const net = mockNetwork()

      bs.network = net
      bs.wm.network = net
      bs.engine.network = net
      await bs.start()
      const get = bs.want(block.cid)

      setTimeout(() => {
        finish(1)
        void bs.put(block.cid, block.block)
      }, 200)

      const res = await get
      expect(res).to.equalBytes(block.block)
      finish(2)

      finish.assert()
      await bs.stop()
    })

    it('block is sent after local add', async () => {
      const me = ids[0]
      const other = ids[1]
      const block = blocks[10]

      const n1: Network = {
        // @ts-expect-error incorrect return type
        async connectTo (id) {
          if (!(isPeerId(id))) {
            throw new Error('Not a peer id')
          }

          if (id.toString() !== other.toString()) {
            throw new Error('unknown peer')
          }

          await Promise.resolve()
        },
        async sendMessage (id, msg) {
          if (id.toString() === other.toString()) {
            await bs2._receiveMessage(me, msg); return
          }
          throw new Error('unknown peer')
        },
        async start () {
          await Promise.resolve()
        },
        async stop () {
          await Promise.resolve()
        },
        async findAndConnect (cid) {
          await Promise.resolve()
        },
        async provide (cid) {
          await Promise.resolve()
        }
      }
      const n2: Network = {
        // @ts-expect-error incorrect return type
        async connectTo (id) {
          if (!(isPeerId(id))) {
            throw new Error('Not a peer id')
          }

          if (id.toString() !== me.toString()) {
            throw new Error('unknown peer')
          }

          await Promise.resolve()
        },
        async sendMessage (id, msg) {
          if (id.toString() === me.toString()) {
            await bs1._receiveMessage(other, msg); return
          }

          throw new Error('unknown peer')
        },
        async start () {
          await Promise.resolve()
        },
        async stop () {
          await Promise.resolve()
        },
        async findAndConnect (cid) {
          await Promise.resolve()
        },
        async provide (cid) {
          await Promise.resolve()
        }
      }

      // Create and start bs1
      const bs1 = new DefaultBitswap(mockLibp2pNode(), blockstore)
      applyNetwork(bs1, n1)
      await bs1.start()

      // Create and start bs2
      const bs2 = new DefaultBitswap(mockLibp2pNode(), new MemoryBlockstore())
      applyNetwork(bs2, n2)
      await bs2.start()

      bs1._onPeerConnected(other)
      bs2._onPeerConnected(me)

      const p1 = bs1.want(block.cid)
      setTimeout(() => {
        void bs2.put(block.cid, block.block)
      }, 1000)
      const b1 = await p1
      expect(b1).to.equalBytes(block.block)

      await bs1.stop()
      await bs2.stop()
    })

    it('double get', async () => {
      const block = blocks[11]

      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)

      const resP = Promise.all([
        bs.want(block.cid),
        bs.want(block.cid)
      ])

      void bs.put(block.cid, block.block)

      const res = await resP
      expect(res[0]).to.equalBytes(block.block)
      expect(res[1]).to.equalBytes(block.block)
    })

    it('gets the same block data with different CIDs', async () => {
      const block = blocks[11]

      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)

      expect(block).to.have.nested.property('cid.code', DAG_PB_CODEC)
      expect(block).to.have.nested.property('cid.version', 0)

      const cid1 = CID.create(0, DAG_PB_CODEC, block.cid.multihash)
      const cid2 = CID.createV1(DAG_PB_CODEC, block.cid.multihash)
      const cid3 = CID.createV1(RAW_CODEC, block.cid.multihash)

      const resP = Promise.all([
        bs.want(cid1),
        bs.want(cid2),
        bs.want(cid3)
      ])

      void bs.put(block.cid, block.block)

      const res = await resP

      // blocks should have the requested CID but with the same data
      expect(res[0]).to.equalBytes(block.block)
      expect(res[1]).to.equalBytes(block.block)
      expect(res[2]).to.equalBytes(block.block)
    })

    it('removes a block from the wantlist when the request is aborted', async () => {
      const [block] = await makeBlocks(1)
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)
      const controller = new AbortController()

      const p = bs.want(block.cid, {
        signal: controller.signal
      })

      await delay(1000)

      expect(wantsBlock(block.cid, bs)).to.be.true()

      controller.abort()

      await expect(p).to.eventually.rejectedWith(/aborted/)

      expect(wantsBlock(block.cid, bs)).to.be.false()
    })

    it('block should still be in the wantlist if only one request is aborted', async () => {
      const [block] = await makeBlocks(1)
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)
      const controller = new AbortController()

      // request twice
      const p1 = bs.want(block.cid, {
        signal: controller.signal
      })
      const p2 = bs.want(block.cid)

      await delay(100)

      // should want the block
      expect(wantsBlock(block.cid, bs)).to.be.true()

      // abort one request
      controller.abort()

      await expect(p1).to.eventually.rejectedWith(/aborted/)

      // here comes the block
      await bs.put(block.cid, block.block)

      // should still want it
      expect(wantsBlock(block.cid, bs)).to.be.true()

      // second request should resolve with the block
      expect(await p2).to.equalBytes(block.block)

      // should not be in the want list any more
      expect(wantsBlock(block.cid, bs)).to.be.false()
    })
  })

  describe('unwant', () => {
    it('removes blocks that are wanted multiple times', async () => {
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)
      await bs.start()

      const b = blocks[12]
      const p = Promise.all([
        bs.want(b.cid),
        bs.want(b.cid)
      ])

      setTimeout(() => { bs.unwant(b.cid) }, 1e3)

      await expect(p).to.eventually.be.rejected()

      await bs.stop()
    })
  })

  describe('ledgerForPeer', () => {
    it('returns null for unknown peer', async () => {
      const bs = new DefaultBitswap(mockLibp2pNode(), blockstore)
      const id = await createEd25519PeerId()
      const ledger = bs.ledgerForPeer(id)
      expect(ledger).to.be.undefined()
    })
  })
})
