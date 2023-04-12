/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import pWaitFor from 'p-wait-for'
import { DefaultBitswap } from '../src/bitswap.js'
import { MemoryBlockstore } from 'blockstore-core/memory'
import { createLibp2pNode } from './utils/create-libp2p-node.js'
import { makeBlocks } from './utils/make-blocks.js'
import { orderedFinish } from './utils/helpers.js'
import { BitswapMessage as Message } from '../src/message/index.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { Libp2p } from '@libp2p/interface-libp2p'
import drain from 'it-drain'
import { CID } from 'multiformats/cid'

/**
 * Creates a repo + libp2pNode + Bitswap with or without DHT
 */
async function createThing (dht: boolean): Promise<{ libp2pNode: Libp2p, bitswap: DefaultBitswap }> {
  const libp2pNode = await createLibp2pNode({
    DHT: dht
  })
  const bitswap = new DefaultBitswap(libp2pNode, new MemoryBlockstore())
  await bitswap.start()
  return { libp2pNode, bitswap }
}

describe('start/stop', () => {
  it('should tell us if the node is started or not', async () => {
    const libp2p = {
      handle: async (): Promise<void> => {},
      unhandle: async (): Promise<void> => {},
      register: async (): Promise<void> => {},
      unregister: async (): Promise<void> => {},
      getConnections: () => []
    }
    // @ts-expect-error not a full libp2p
    const bitswap = new DefaultBitswap(libp2p, new MemoryBlockstore())

    expect(bitswap.isStarted()).to.be.false()

    await bitswap.start()

    expect(bitswap.isStarted()).to.be.true()

    await bitswap.stop()

    expect(bitswap.isStarted()).to.be.false()
  })

  it('notify should be a noop if not started', () => {
    const libp2p = {
      handle: async (): Promise<void> => {},
      unhandle: async (): Promise<void> => {},
      register: async (): Promise<void> => {},
      unregister: async (): Promise<void> => {},
      getConnections: () => []
    }
    // @ts-expect-error not a full libp2p
    const bitswap = new DefaultBitswap(libp2p, new MemoryBlockstore())

    expect(bitswap.isStarted()).to.be.false()

    bitswap.notify(CID.parse('QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn'), new Uint8Array(0))
  })
})

describe('bitswap without DHT', function () {
  this.timeout(20 * 1000)

  let nodes: Array<{ libp2pNode: Libp2p, bitswap: DefaultBitswap }>

  before(async () => {
    nodes = await Promise.all([
      createThing(false),
      createThing(false),
      createThing(false)
    ])

    // connect 0 -> 1 && 1 -> 2
    const ma1 = nodes[1].libp2pNode.getMultiaddrs()[0]
    const ma2 = nodes[2].libp2pNode.getMultiaddrs()[0]

    await Promise.all([
      nodes[0].libp2pNode.dial(ma1),
      nodes[1].libp2pNode.dial(ma2)
    ])
  })

  after(async () => {
    await Promise.all(nodes.map(async (node) => await Promise.all([
      node.bitswap.stop(),
      node.libp2pNode.stop()
    ])))
  })

  it('put a block in 2, fail to get it in 0', async () => {
    const finish = orderedFinish(2)

    const [block] = await makeBlocks(1)
    await nodes[2].bitswap.put(block.cid, block.block)

    const node0Get = nodes[0].bitswap.want(block.cid)

    setTimeout(() => {
      finish(1)
      nodes[0].bitswap.unwant(block.cid)
    }, 200)

    await expect(node0Get).to.eventually.be.rejectedWith(/unwanted/)
    finish(2)

    finish.assert()
  })

  it('wants a block, receives a block, wants it again before the blockstore has it, receives it after the blockstore has it', async () => {
    // the block we want
    const [block] = await makeBlocks(1)

    // id of a peer with the block we want
    const peerId = await createEd25519PeerId()

    // incoming message with requested block from the other peer
    const message = new Message(false)
    message.addEntry(block.cid, 1, Message.WantType.Block)
    message.addBlock(block.cid, block.block)

    const mockBlockstore: any = {
      get: sinon.stub().withArgs(block.cid).throws({ code: 'ERR_NOT_FOUND' }),
      has: sinon.stub().withArgs(block.cid).returns(false),
      put: sinon.stub()
    }

    // slow blockstore
    nodes[0].bitswap.blockstore = mockBlockstore

    // add the block to our want list
    const wantBlockPromise1 = nodes[0].bitswap.want(block.cid)

    // oh look, a peer has sent it to us - this will trigger a `blockstore.put` which
    // is an async operation so `self.blockstore.get(cid)` will still throw
    // until the write has completed
    await nodes[0].bitswap._receiveMessage(peerId, message)

    // block store did not have it
    expect(mockBlockstore.get.calledWith(block.cid)).to.be.true()

    // another context wants the same block
    const wantBlockPromise2 = nodes[0].bitswap.want(block.cid)

    // meanwhile the blockstore has written the block
    nodes[0].bitswap.blockstore.has = sinon.stub().withArgs(block.cid).returns(true)

    // here it comes again
    await nodes[0].bitswap._receiveMessage(peerId, message)

    // block store had it this time
    expect(mockBlockstore.get.calledWith(block.cid)).to.be.true()

    // both requests should get the block
    expect(await wantBlockPromise1).to.equalBytes(block.block)
    expect(await wantBlockPromise2).to.equalBytes(block.block)
  })
})

describe('bitswap with DHT', function () {
  this.timeout(60 * 1000)

  let nodes: Array<{ libp2pNode: Libp2p, bitswap: DefaultBitswap }>

  before(async () => {
    nodes = await Promise.all([
      createThing(true),
      createThing(true),
      createThing(true)
    ])

    // connect 0 -> 1 && 1 -> 2
    const ma1 = nodes[1].libp2pNode.getMultiaddrs()[0]
    const ma2 = nodes[2].libp2pNode.getMultiaddrs()[0]

    await Promise.all([
      nodes[0].libp2pNode.dial(ma1),
      nodes[1].libp2pNode.dial(ma2)
    ])

    // wait until dht routing tables are updated
    await Promise.all([
      pWaitFor(() => nodes[0].libp2pNode.dht?.lan?.routingTable?.size != null && nodes[0].libp2pNode.dht?.lan?.routingTable?.size >= 1),
      pWaitFor(() => nodes[1].libp2pNode.dht?.lan?.routingTable?.size != null && nodes[1].libp2pNode.dht?.lan?.routingTable?.size >= 2),
      pWaitFor(() => nodes[2].libp2pNode.dht?.lan?.routingTable?.size != null && nodes[2].libp2pNode.dht?.lan?.routingTable?.size >= 1)
    ])
  })

  after(async () => {
    await Promise.all(nodes.map(async (node) => await Promise.all([
      node.bitswap.stop(),
      node.libp2pNode.stop()
    ])))
  })

  it('put a block in 2, get it in 0', async () => {
    const [block] = await makeBlocks(1)

    if (nodes[2].libp2pNode.dht == null) {
      throw new Error('DHT was not configured')
    }

    const provideSpy = sinon.spy(nodes[2].libp2pNode.dht, 'provide')
    await nodes[2].bitswap.put(block.cid, block.block)

    // wait for the DHT to finish providing
    await drain(provideSpy.returnValues[0])

    const blockRetrieved = await nodes[0].bitswap.want(block.cid)
    expect(block.block).to.eql(blockRetrieved)
  })
})
