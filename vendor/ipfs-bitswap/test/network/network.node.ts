/* eslint-env mocha */

import { expect, assert } from 'aegir/chai'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import pDefer from 'p-defer'
import { createLibp2pNode } from '../utils/create-libp2p-node.js'
import { makeBlocks } from '../utils/make-blocks.js'
import { Network } from '../../src/network.js'
import { BitswapMessage as Message } from '../../src/message/index.js'
import { Stats } from '../../src/stats/index.js'
import sinon from 'sinon'
import { CID } from 'multiformats/cid'
import delay from 'delay'
import type { DefaultBitswap } from '../../src/bitswap.js'
import type { Libp2p } from '@libp2p/interface-libp2p'

function createBitswapMock (): DefaultBitswap {
  // @ts-expect-error incomplete implementation
  return {
    _receiveMessage: async (): Promise<void> => {},
    _receiveError: (): void => {},
    _onPeerConnected: (): void => {},
    _onPeerDisconnected: (): void => {}
  }
}

describe('network', () => {
  let p2pA: Libp2p
  let networkA: Network
  let bitswapMockA: DefaultBitswap

  let p2pB: Libp2p
  let networkB: Network
  let bitswapMockB: DefaultBitswap

  let p2pC: Libp2p
  let networkC: Network
  let bitswapMockC: DefaultBitswap

  let blocks: Array<{ cid: CID, block: Uint8Array }>

  beforeEach(async () => {
    [p2pA, p2pB, p2pC] = await Promise.all([
      createLibp2pNode(),
      createLibp2pNode(),
      createLibp2pNode()
    ])
    blocks = await makeBlocks(2)

    bitswapMockA = createBitswapMock()
    bitswapMockB = createBitswapMock()
    bitswapMockC = createBitswapMock()

    // @ts-expect-error {} is not a real libp2p
    networkA = new Network(p2pA, bitswapMockA, new Stats({}))
    // @ts-expect-error {} is not a real libp2p
    networkB = new Network(p2pB, bitswapMockB, new Stats({}))
    // only bitswap100
    // @ts-expect-error {} is not a real libp2p
    networkC = new Network(p2pC, bitswapMockC, new Stats({}), { b100Only: true })

    await networkA.start()
    await networkB.start()
    await networkC.start()
  })

  afterEach(async () => {
    await p2pA.stop()
    await p2pB.stop()
    await p2pC.stop()
  })

  it('connectTo fail', async () => {
    try {
      await networkA.connectTo(p2pB.peerId)
      assert.fail()
    } catch (err) {
      expect(err).to.exist()
    }
  })

  it('onPeerConnected success', async () => {
    const p2pAConnected = pDefer()
    const p2pBConnected = pDefer()

    bitswapMockA._onPeerConnected = (peerId) => {
      expect(peerId.toString()).to.equal(p2pB.peerId.toString())
      p2pBConnected.resolve()
    }

    bitswapMockB._onPeerConnected = (peerId) => {
      expect(peerId.toString()).to.equal(p2pA.peerId.toString())
      p2pAConnected.resolve()
    }

    const ma = p2pB.getMultiaddrs()[0]
    await p2pA.dial(ma)

    await Promise.all([
      p2pAConnected,
      p2pBConnected
    ])
  })

  it('connectTo success', async () => {
    await p2pA.peerStore.addressBook.add(p2pB.peerId, p2pB.getMultiaddrs())
    await networkA.connectTo(p2pB.peerId)
  })

  it('sets up peer handlers for previously connected peers', async () => {
    let p2pAConnected = pDefer()
    let p2pBConnected = pDefer()

    bitswapMockA._onPeerConnected = (peerId) => {
      expect(peerId.toString()).to.equal(p2pB.peerId.toString())
      p2pBConnected.resolve()
    }

    bitswapMockB._onPeerConnected = (peerId) => {
      expect(peerId.toString()).to.equal(p2pA.peerId.toString())
      p2pAConnected.resolve()
    }

    const ma = p2pB.getMultiaddrs()[0]
    await p2pA.dial(ma)

    await Promise.all([
      p2pAConnected,
      p2pBConnected
    ])

    await networkA.stop()
    await networkB.stop()

    p2pAConnected = pDefer()
    p2pBConnected = pDefer()

    await networkA.start()
    await networkB.start()

    await Promise.all([
      p2pAConnected,
      p2pBConnected
    ])
  })

  const versions = [{
    num: '1.0.0', serialize: (msg: Message) => msg.serializeToBitswap100()
  }, {
    num: '1.1.0', serialize: (msg: Message) => msg.serializeToBitswap110()
  }, {
    num: '1.2.0', serialize: (msg: Message) => msg.serializeToBitswap110()
  }]
  for (const version of versions) {
    it('._receiveMessage success from Bitswap ' + version.num, async () => { // eslint-disable-line no-loop-func
      const msg = new Message(true)
      const b1 = blocks[0]
      const b2 = blocks[1]
      const deferred = pDefer()

      msg.addEntry(b1.cid, 0)
      msg.addBlock(b1.cid, b1.block)
      msg.addBlock(b2.cid, b2.block)

      bitswapMockB._receiveMessage = async (peerId, msgReceived) => { // eslint-disable-line require-await
        // cannot do deep comparison on objects as one has Buffers and one has Uint8Arrays
        expect(msg.serializeToBitswap110()).to.equalBytes(msgReceived.serializeToBitswap110())

        bitswapMockB._receiveMessage = async (): Promise<void> => {}
        bitswapMockB._receiveError = (): void => {}
        deferred.resolve()
      }

      bitswapMockB._receiveError = (err) => { deferred.reject(err) }

      const ma = p2pB.getMultiaddrs()[0]
      const stream = await p2pA.dialProtocol(ma, '/ipfs/bitswap/' + version.num)

      await pipe(
        [version.serialize(msg)],
        (source) => lp.encode(source),
        stream
      )

      await deferred.promise
    })
  }

  // From p2pA to p2pB
  it('.sendMessage on Bitswap 1.1.0', async () => {
    const msg = new Message(true)
    const b1 = blocks[0]
    const b2 = blocks[1]
    const deferred = pDefer()

    msg.addEntry(b1.cid, 0)
    msg.addBlock(b1.cid, b1.block)
    msg.addBlock(b2.cid, b2.block)

    // In a real network scenario, peers will be discovered and their addresses
    // will be added to the addressBook before bitswap kicks in
    await p2pA.peerStore.addressBook.set(p2pB.peerId, p2pB.getMultiaddrs())

    bitswapMockB._receiveMessage = async (peerId, msgReceived) => { // eslint-disable-line require-await
      // cannot do deep comparison on objects as one has Buffers and one has Uint8Arrays
      expect(msg.serializeToBitswap110()).to.equalBytes(msgReceived.serializeToBitswap110())

      bitswapMockB._receiveMessage = async (): Promise<void> => {}
      bitswapMockB._receiveError = (): void => {}
      deferred.resolve()
    }

    bitswapMockB._receiveError = deferred.reject

    await networkA.sendMessage(p2pB.peerId, msg)
  })

  it('dial to peer on Bitswap 1.0.0', async () => {
    const ma = p2pC.getMultiaddrs()[0]
    const stream = await p2pA.dialProtocol(ma, ['/ipfs/bitswap/1.1.0', '/ipfs/bitswap/1.0.0'])

    expect(stream).to.have.nested.property('stat.protocol', '/ipfs/bitswap/1.0.0')
  })

  // From p2pA to p2pC
  it('.sendMessage on Bitswap 1.1.0', async () => {
    const msg = new Message(true)
    const b1 = blocks[0]
    const b2 = blocks[1]
    const deferred = pDefer()

    msg.addEntry(b1.cid, 0)
    msg.addBlock(b1.cid, b1.block)
    msg.addBlock(b2.cid, b2.block)

    // In a real network scenario, peers will be discovered and their addresses
    // will be added to the addressBook before bitswap kicks in
    await p2pA.peerStore.addressBook.set(p2pC.peerId, p2pC.getMultiaddrs())

    bitswapMockC._receiveMessage = async (peerId, msgReceived) => { // eslint-disable-line require-await
      // cannot do deep comparison on objects as one has Buffers and one has Uint8Arrays
      expect(msg.serializeToBitswap110()).to.equalBytes(msgReceived.serializeToBitswap110())

      bitswapMockC._receiveMessage = async (): Promise<void> => {}
      bitswapMockC._receiveError = (): void => {}
      deferred.resolve()
    }

    bitswapMockC._receiveError = deferred.reject

    await networkA.sendMessage(p2pC.peerId, msg)
    await deferred.promise
  })

  it('dials to peer using Bitswap 1.2.0', async () => {
    await networkA.stop()
    await networkB.stop()

    // only supports 1.2.0
    networkB._protocols = ['/ipfs/bitswap/1.2.0']

    await networkA.start()
    await networkB.start()

    // In a real network scenario, peers will be discovered and their addresses
    // will be added to the addressBook before bitswap kicks in
    await p2pA.peerStore.addressBook.set(p2pB.peerId, p2pB.getMultiaddrs())

    const deferred = pDefer()

    bitswapMockB._receiveMessage = async () => {
      deferred.resolve()
    }

    await networkA.sendMessage(p2pB.peerId, new Message(true))

    return deferred
  })

  it('survives connection failures', async () => {
    const mockFindProviders = sinon.stub()
    const mockDial = sinon.stub()

    const libp2p: Libp2p = {
      // @ts-expect-error incomplete implementation
      contentRouting: {
        findProviders: mockFindProviders
      },
      register: sinon.stub(),
      unregister: sinon.stub(),
      getConnections: () => [],
      dial: mockDial,
      handle: sinon.stub()
    }

    const network = new Network(libp2p, bitswapMockA, new Stats(libp2p))

    const cid = CID.parse('QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn')
    const provider1 = {
      id: 'provider1'
    }
    const provider2 = {
      id: 'provider2'
    }

    mockFindProviders.withArgs(cid).returns([
      provider1,
      provider2
    ])

    mockDial.withArgs(provider1.id).returns(Promise.reject(new Error('Could not dial')))
    mockDial.withArgs(provider2.id).returns(Promise.resolve())

    await network.start()

    await network.findAndConnect(cid)

    expect(mockDial.calledWith(provider1.id)).to.be.true()
    expect(mockDial.calledWith(provider2.id)).to.be.true()
  })

  it('times out slow senders', async () => {
    const deferred = pDefer()

    const libp2p = {
      handle: sinon.stub(),
      register: sinon.stub(),
      unregister: sinon.stub(),
      getConnections: () => []
    }

    // @ts-expect-error not a complete libp2p implementation
    const network = new Network(libp2p, {}, {}, {
      incomingStreamTimeout: 1
    })
    await network.start()

    const stream = {
      source: (async function * () {
        await delay(100)
        yield 'hello'
      }()),
      abort: (err: Error) => {
        deferred.resolve(err)
      },
      stat: {
        protocol: 'hello'
      }
    }

    const handler = libp2p.handle.getCall(0).args[1]
    handler({ stream, connection: {} })

    const err = await deferred.promise
    expect(err).to.have.property('code', 'ABORT_ERR')
  })
})
