/* eslint-env mocha */

import { expect } from 'aegir/chai'
// @ts-expect-error no types
import range from 'lodash.range'
// @ts-expect-error no types
import difference from 'lodash.difference'
// @ts-expect-error no types
import flatten from 'lodash.flatten'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import drain from 'it-drain'
import defer from 'p-defer'
import { BitswapMessage as Message } from '../../src/message/index.js'
import { DecisionEngine } from '../../src/decision-engine/index.js'
import { Stats } from '../../src/stats/index.js'
import { MemoryBlockstore } from 'blockstore-core/memory'
import { makeBlocks } from '../utils/make-blocks.js'
import { makePeerId, makePeerIds } from '../utils/make-peer-id.js'
import { mockNetwork } from '../utils/mocks.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { Network } from '../../src/network.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Blockstore } from 'interface-blockstore'

const sum = (nums: number[]): number => nums.reduce((a, b) => a + b, 0)

function messageToString (m: Message): string[] {
  return Array.from(m.blocks.values())
    .map((b) => uint8ArrayToString(b))
}

function stringifyMessages (messages: Message[]): string[] {
  return flatten(messages.map(messageToString))
}

async function newEngine (network: Network): Promise<{ peer: PeerId, engine: DecisionEngine }> {
  const peerId = await createEd25519PeerId()
  // @ts-expect-error {} is not a real libp2p
  const engine = new DecisionEngine(peerId, new MemoryBlockstore(), network, new Stats({}), {})
  engine.start()
  return { peer: peerId, engine }
}

describe('Engine', () => {
  it('consistent accounting', async () => {
    const res = await Promise.all([
      newEngine(mockNetwork()),
      newEngine(mockNetwork())
    ])

    const sender = res[0]
    const receiver = res[1]

    await Promise.all(range(1000).map(async (i: number) => {
      const data = uint8ArrayFromString(`this is message ${i}`)
      const hash = await sha256.digest(data)

      const m = new Message(false)
      const cid = CID.createV0(hash)
      m.addBlock(cid, data)
      sender.engine.messageSent(receiver.peer, cid, data)
      await receiver.engine.messageReceived(sender.peer, m)
    }))

    expect(sender.engine.numBytesSentTo(receiver.peer))
      .to.be.above(0)

    expect(sender.engine.numBytesSentTo(receiver.peer))
      .to.eql(receiver.engine.numBytesReceivedFrom(sender.peer))

    expect(receiver.engine.numBytesSentTo(sender.peer))
      .to.eql(0)

    expect(sender.engine.numBytesReceivedFrom(receiver.peer))
      .to.eql(0)
  })

  it('peer is added to peers when message received or sent', async () => {
    const res = await Promise.all([
      newEngine(mockNetwork()),
      newEngine(mockNetwork())
    ])

    const sanfrancisco = res[0]
    const seattle = res[1]

    const m = new Message(true)
    sanfrancisco.engine.messageSent(seattle.peer, CID.parse('QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn'), new Uint8Array())

    await seattle.engine.messageReceived(sanfrancisco.peer, m)

    expect(seattle.peer.toString())
      .to.not.eql(sanfrancisco.peer.toString())
    expect(sanfrancisco.engine.peers()).to.include(seattle.peer)
    expect(seattle.engine.peers()).to.include(sanfrancisco.peer)
  })

  it('partner wants then cancels', async function () {
    this.timeout(40 * 1000)

    const numRounds = 10
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
    const vowels = 'aeiou'.split('')
    const testCases = [{
      set: alphabet,
      cancels: vowels
    }, {
      set: alphabet,
      cancels: difference(alphabet, vowels)
    }]

    async function partnerWants (dEngine: DecisionEngine, values: string[], partner: PeerId): Promise<void> {
      const message = new Message(false)

      const hashes = await Promise.all(values.map(async (v) => await sha256.digest(uint8ArrayFromString(v))))
      hashes.forEach((hash, i) => {
        message.addEntry(CID.createV0(hash), Math.pow(2, 32) - 1 - i)
      })
      await dEngine.messageReceived(partner, message)
    }

    async function partnerCancels (dEngine: DecisionEngine, values: string[], partner: PeerId): Promise<void> {
      const message = new Message(false)

      const hashes = await Promise.all(values.map(async (v) => await sha256.digest(uint8ArrayFromString(v))))
      hashes.forEach((hash) => {
        message.cancel(CID.createV0(hash))
      })
      await dEngine.messageReceived(partner, message)
    }

    async function peerSendsBlocks (dEngine: DecisionEngine, blockstore: Blockstore, blocks: Array<{ cid: CID, block: Uint8Array }>): Promise<void> {
      // Bitswap puts blocks into the blockstore then passes the blocks to the
      // Decision Engine
      await drain(blockstore.putMany(blocks))
      dEngine.receivedBlocks(blocks)
    }

    const hashes = await Promise.all(alphabet.map(async v => await sha256.digest(uint8ArrayFromString(v))))
    const blocks = hashes.map((h, i) => {
      return {
        cid: CID.createV0(h),
        block: uint8ArrayFromString(alphabet[i])
      }
    })
    const partner = await createEd25519PeerId()

    for (let i = 0; i < numRounds; i++) {
      // 2 test cases
      //   a) want alphabet - cancel vowels
      //   b) want alphabet - cancels everything except vowels

      for (const { set, cancels } of testCases) {
        const keeps = difference(set, cancels)
        const deferred = defer()
        const network = mockNetwork(1, (res) => {
          const msgs = stringifyMessages(res.messages.map(([_, message]) => message))
          expect(msgs.sort()).to.eql(keeps.sort())
          deferred.resolve()
        })
        const id = await createEd25519PeerId()
        const blockstore = new MemoryBlockstore()
        // @ts-expect-error {} is not a real libp2p
        const dEngine = new DecisionEngine(id, blockstore, network, new Stats({}), {})
        dEngine.start()

        // Send wants then cancels for some of the wants
        await partnerWants(dEngine, set, partner)
        await partnerCancels(dEngine, cancels, partner)

        // Simulate receiving blocks from the network
        await peerSendsBlocks(dEngine, blockstore, blocks)

        await deferred.promise
      }
    }
  })

  it('round-robins incoming wants', async () => {
    const id = await makePeerId()
    const peers = await makePeerIds(3)
    const blockSize = 256 * 1024
    const blocks = await makeBlocks(20, blockSize)

    const blockIndex = (cid: CID): number => {
      for (const [i, b] of blocks.entries()) {
        if (b.cid.equals(cid)) {
          return i
        }
      }
      return -1
    }

    const blockstore = new MemoryBlockstore()
    await drain(blockstore.putMany(blocks))

    let rcvdBlockCount = 0
    const received = new Map(peers.map(p => [p.toString(), { count: 0, bytes: 0 }]))
    const deferred = defer()
    const network = mockNetwork(blocks.length, undefined, (peer, msg) => {
      const pid = peer.toString()
      const rcvd = received.get(pid)

      if (rcvd == null) {
        deferred.reject(new Error(`Could not get received for peer ${pid}`)); return
      }

      // Blocks should arrive in priority order.
      // Note: we requested the blocks such that the priority order was
      // highest at the start to lowest at the end.
      for (const cidStr of msg.blocks.keys()) {
        expect(blockIndex(CID.parse(cidStr))).to.gte(rcvd.count)
      }

      rcvd.count += msg.blocks.size
      rcvd.bytes += sum([...msg.blocks.values()].map(b => b.length))

      // pendingBytes should be equal to the remaining data we're expecting
      expect(msg.pendingBytes).to.eql(blockSize * blocks.length - rcvd.bytes)

      // Expect each peer to receive blocks in a roughly round-robin fashion,
      // in other words one peer shouldn't receive a bunch more blocks than
      // the others at any given time.
      for (const p of peers) {
        if (p !== peer) {
          const peerCount = received.get(p.toString())

          if (peerCount == null) {
            deferred.reject(new Error(`Could not get peer count for ${p.toString()}`)); return
          }

          const pCount = peerCount.count
          expect(rcvd.count - pCount).to.lt(blocks.length * 0.8)
        }
      }

      // When all peers have received all the blocks, we're done
      rcvdBlockCount += msg.blocks.size
      if (rcvdBlockCount === blocks.length * peers.length) {
        // Make sure each peer received all blocks it was expecting
        for (const peer of peers) {
          const pid = peer.toString()
          const rcvd = received.get(pid)

          if (rcvd == null) {
            deferred.reject(new Error(`Could not get peer count for ${pid}`)); return
          }

          expect(rcvd.count).to.eql(blocks.length)
        }

        deferred.resolve()
      }
    })

    // @ts-expect-error {} is not a real libp2p
    const dEngine = new DecisionEngine(id, blockstore, network, new Stats({}), {})
    dEngine.start()

    // Each peer requests all blocks
    for (const peer of peers) {
      const message = new Message(false)

      for (const [i, block] of blocks.entries()) {
        message.addEntry(block.cid, blocks.length - i)
      }

      await dEngine.messageReceived(peer, message)
    }

    await deferred.promise
  })

  it('sends received blocks to peers that want them', async () => {
    const [id, peer] = await makePeerIds(2)
    const blocks = await makeBlocks(4, 8 * 1024)

    const deferred = defer<[PeerId, Message]>()
    const network = mockNetwork(blocks.length, undefined, (peer, msg) => { deferred.resolve([peer, msg]) })
    const blockstore = new MemoryBlockstore()
    // @ts-expect-error {} is not a real libp2p
    const dEngine = new DecisionEngine(id, blockstore, network, new Stats({}), {}, { maxSizeReplaceHasWithBlock: 0 })
    dEngine.start()

    const message = new Message(false)
    message.addEntry(blocks[0].cid, 4, Message.WantType.Have, false)
    message.addEntry(blocks[1].cid, 3, Message.WantType.Have, false)
    message.addEntry(blocks[2].cid, 2, Message.WantType.Block, false)
    message.addEntry(blocks[3].cid, 1, Message.WantType.Block, false)
    await dEngine.messageReceived(peer, message)

    // Simulate receiving message - put blocks into the blockstore then pass
    // them to the Decision Engine
    const rcvdBlocks = [blocks[0], blocks[2]]
    await drain(blockstore.putMany(rcvdBlocks))
    dEngine.receivedBlocks(rcvdBlocks)

    // Wait till the engine sends a message
    const [toPeer, msg] = await deferred.promise

    // Expect the message to be sent to the peer that wanted the blocks
    expect(toPeer.toString()).to.eql(peer.toString())
    // Expect the correct wanted block
    expect(msg.blocks.size).to.eql(1)
    expect(msg.blocks.has(blocks[2].cid.toString(base58btc))).to.eql(true)
    // Expect the correct wanted HAVE
    expect(msg.blockPresences.size).to.eql(1)
    expect(msg.blockPresences.has(blocks[0].cid.toString(base58btc))).to.eql(true)
    expect(msg.blockPresences.get(blocks[0].cid.toString(base58btc))).to.eql(Message.BlockPresenceType.Have)
  })

  it('sends DONT_HAVE', async () => {
    const [id, peer] = await makePeerIds(2)
    const blocks = await makeBlocks(4, 8 * 1024)

    let onMsg: Function
    const receiveMessage = async (): Promise<[PeerId, Message]> => await new Promise<[PeerId, Message]>(resolve => {
      onMsg = resolve
    })
    const network = mockNetwork(blocks.length, undefined, (peerId, message) => {
      onMsg([peerId, message])
    })
    const blockstore = new MemoryBlockstore()
    // @ts-expect-error {} is not a real libp2p
    const dEngine = new DecisionEngine(id, blockstore, network, new Stats({}), {}, { maxSizeReplaceHasWithBlock: 0 })
    dEngine.start()

    const message = new Message(false)
    message.addEntry(blocks[0].cid, 4, Message.WantType.Have, false, false)
    message.addEntry(blocks[1].cid, 3, Message.WantType.Have, false, true) // send dont have
    message.addEntry(blocks[2].cid, 2, Message.WantType.Block, false, false)
    message.addEntry(blocks[3].cid, 1, Message.WantType.Block, false, true) // send dont have
    await dEngine.messageReceived(peer, message)

    // Wait till the engine sends a message
    const [toPeer, msg] = await receiveMessage()

    // Expect DONT_HAVEs for blocks 1 and 3
    expect(toPeer.toString()).to.eql(peer.toString())
    expect(msg.blockPresences.size).to.eql(2)
    for (const block of [blocks[1], blocks[3]]) {
      const cid = block.cid.toString(base58btc)
      expect(msg.blockPresences.has(cid)).to.eql(true)
      expect(msg.blockPresences.get(cid)).to.eql(Message.BlockPresenceType.DontHave)
    }

    // Simulate receiving message with blocks - put blocks into the blockstore
    // then pass them to the Decision Engine
    await drain(blockstore.putMany(blocks))
    dEngine.receivedBlocks(blocks)

    const [toPeer2, msg2] = await receiveMessage()
    expect(toPeer2.toString()).to.eql(peer.toString())
    expect(msg2.blocks.size).to.eql(2)
    expect(msg2.blockPresences.size).to.eql(2)
    for (const block of [blocks[0], blocks[1]]) {
      const cid = block.cid.toString(base58btc)
      expect(msg2.blockPresences.has(cid)).to.eql(true)
      expect(msg2.blockPresences.get(cid)).to.eql(Message.BlockPresenceType.Have)
    }
  })

  it('handles want-have and want-block', async () => {
    const [id, partner] = await makePeerIds(2)

    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    const vowels = 'aeiou'

    const alphabetLs = alphabet.split('')
    const hashes = await Promise.all(alphabetLs.map(async v => await sha256.digest(uint8ArrayFromString(v))))
    const blocks = hashes.map((h, i) => {
      return {
        cid: CID.createV0(h),
        block: uint8ArrayFromString(alphabetLs[i])
      }
    })

    let testCases = [
      // Just send want-blocks
      {
        only: false,
        wls: [
          {
            wantBlks: vowels,
            wantHaves: '',
            sendDontHave: false
          }
        ],
        exp: {
          blks: vowels
        }
      },

      // Send want-blocks and want-haves
      {
        wls: [
          {
            wantBlks: vowels,
            wantHaves: 'fgh',
            sendDontHave: false
          }
        ],
        exp: {
          blks: vowels,
          haves: 'fgh'
        }
      },

      // Send want-blocks and want-haves, with some want-haves that are not
      // present, but without requesting DONT_HAVES
      {
        wls: [
          {
            wantBlks: vowels,
            wantHaves: 'fgh123',
            sendDontHave: false
          }
        ],
        exp: {
          blks: vowels,
          haves: 'fgh'
        }
      },

      // Send want-blocks and want-haves, with some want-haves that are not
      // present, and request DONT_HAVES
      {
        wls: [
          {
            wantBlks: vowels,
            wantHaves: 'fgh123',
            sendDontHave: true
          }
        ],
        exp: {
          blks: vowels,
          haves: 'fgh',
          dontHaves: '123'
        }
      },

      // Send want-blocks and want-haves, with some want-blocks and want-haves that are not
      // present, but without requesting DONT_HAVES
      {
        wls: [
          {
            wantBlks: 'aeiou123',
            wantHaves: 'fgh456',
            sendDontHave: false
          }
        ],
        exp: {
          blks: 'aeiou',
          haves: 'fgh',
          dontHaves: ''
        }
      },

      // Send want-blocks and want-haves, with some want-blocks and want-haves that are not
      // present, and request DONT_HAVES
      {
        wls: [
          {
            wantBlks: 'aeiou123',
            wantHaves: 'fgh456',
            sendDontHave: true
          }
        ],
        exp: {
          blks: 'aeiou',
          haves: 'fgh',
          dontHaves: '123456'
        }
      },

      // Send repeated want-blocks
      {
        wls: [
          {
            wantBlks: 'ae',
            sendDontHave: false
          },
          {
            wantBlks: 'io',
            sendDontHave: false
          },
          {
            wantBlks: 'u',
            sendDontHave: false
          }
        ],
        exp: {
          blks: 'aeiou'
        }
      },

      // Send repeated want-blocks and want-haves
      {
        wls: [
          {
            wantBlks: 'ae',
            wantHaves: 'jk',
            sendDontHave: false
          },
          {
            wantBlks: 'io',
            wantHaves: 'lm',
            sendDontHave: false
          },
          {
            wantBlks: 'u',
            sendDontHave: false
          }
        ],
        exp: {
          blks: 'aeiou',
          haves: 'jklm'
        }
      },

      // Send repeated want-blocks and want-haves, with some want-blocks and want-haves that are not
      // present, and request DONT_HAVES
      {
        wls: [
          {
            wantBlks: 'ae12',
            wantHaves: 'jk5',
            sendDontHave: true
          },
          {
            wantBlks: 'io34',
            wantHaves: 'lm',
            sendDontHave: true
          },
          {
            wantBlks: 'u',
            wantHaves: '6',
            sendDontHave: true
          }
        ],
        exp: {
          blks: 'aeiou',
          haves: 'jklm',
          dontHaves: '123456'
        }
      },

      // Send want-block then want-have for same CID
      {
        wls: [
          {
            wantBlks: 'a',
            sendDontHave: true
          },
          {
            wantHaves: 'a',
            sendDontHave: true
          }
        ],
        // want-have should be ignored because there was already a
        // want-block for the same CID in the queue
        exp: {
          blks: 'a'
        }
      },

      // Send want-have then want-block for same CID
      {
        wls: [
          {
            wantBlks: '',
            wantHaves: 'b',
            sendDontHave: true
          },
          {
            wantBlks: 'b',
            wantHaves: '',
            sendDontHave: true
          }
        ],
        // want-block should overwrite existing want-have
        exp: {
          blks: 'b'
        }
      },

      // Send want-block then want-block for same CID
      {
        wls: [
          {
            wantBlks: 'a',
            wantHaves: '',
            sendDontHave: true
          },
          {
            wantBlks: 'a',
            wantHaves: '',
            sendDontHave: true
          }
        ],
        // second want-block should be ignored
        exp: {
          blks: 'a'
        }
      },

      // Send want-have then want-have for same CID
      {
        wls: [
          {
            wantBlks: '',
            wantHaves: 'a',
            sendDontHave: true
          },
          {
            wantBlks: '',
            wantHaves: 'a',
            sendDontHave: true
          }
        ],
        // second want-have should be ignored
        exp: {
          haves: 'a'
        }
      }
    ]

    async function partnerWantBlocksHaves (dEngine: DecisionEngine, wantBlks: string[], wantHaves: string[], sendDontHave: boolean, partner: PeerId): Promise<void> {
      const wantTypes = [{
        type: Message.WantType.Block,
        blocks: wantBlks
      }, {
        type: Message.WantType.Have,
        blocks: wantHaves
      }]

      let i = wantBlks.length + wantHaves.length
      const message = new Message(false)
      for (const { type, blocks } of wantTypes) {
        const hashes = await Promise.all(blocks.map(async (v) => await sha256.digest(uint8ArrayFromString(v))))
        for (const hash of hashes) {
          message.addEntry(CID.createV0(hash), i--, type, false, sendDontHave)
        }
      }
      await dEngine.messageReceived(partner, message)
    }

    let onMsg: Function | undefined
    const nextMessage = async (): Promise<Message> => {
      return await new Promise<Message>(resolve => {
        onMsg = resolve
        void dEngine._processTasks()
      })
    }
    const network = mockNetwork(blocks.length, undefined, (peer, msg) => {
      onMsg?.(msg)
      onMsg = undefined
    })

    const blockstore = new MemoryBlockstore()
    await drain(blockstore.putMany(blocks))
    // @ts-expect-error {} is not a real libp2p
    const dEngine = new DecisionEngine(id, blockstore, network, new Stats({}), {}, { maxSizeReplaceHasWithBlock: 0 })
    dEngine._scheduleProcessTasks = (): void => {}
    dEngine.start()

    const onlyCases = []
    for (const testCase of testCases) {
      // eslint-disable-next-line
      if (testCase.only) {
        onlyCases.push(testCase)
      }
    }
    if (onlyCases.length > 0) {
      testCases = onlyCases
    }

    for (const [, testCase] of Object.entries(testCases)) {
      // console.log("Test case %d:", i)
      for (const wl of testCase.wls) {
        // console.log("  want-blocks '%s' / want-haves '%s' / sendDontHave %s",
        //   wl.wantBlks || '', wl.wantHaves || '', wl.sendDontHave)
        const wantBlks = (wl.wantBlks ?? '').split('')
        const wantHaves = (wl.wantHaves ?? '').split('')
        await partnerWantBlocksHaves(dEngine, wantBlks, wantHaves, wl.sendDontHave, partner)
      }

      const expBlks = (testCase.exp.blks ?? '').split('')
      const expHaves = (testCase.exp.haves ?? '').split('')
      const expDontHaves = (testCase.exp.dontHaves ?? '').split('')

      const msg = await nextMessage()

      // Expect the correct number of blocks and block presences
      expect(msg.blocks.size).to.eql(expBlks.length)
      expect(msg.blockPresences.size).to.eql(expHaves.length + expDontHaves.length)

      // Expect the correct block contents
      for (const expBlk of expBlks) {
        const hash = await sha256.digest(uint8ArrayFromString(expBlk))
        expect(msg.blocks.has(CID.createV0(hash).toString(base58btc)))
      }

      // Expect the correct HAVEs
      for (const expHave of expHaves) {
        const hash = await sha256.digest(uint8ArrayFromString(expHave))
        const cid = CID.createV0(hash).toString(base58btc)
        expect(msg.blockPresences.has(cid)).to.eql(true)
        expect(msg.blockPresences.get(cid)).to.eql(Message.BlockPresenceType.Have)
      }

      // Expect the correct DONT_HAVEs
      for (const expDontHave of expDontHaves) {
        const hash = await sha256.digest(uint8ArrayFromString(expDontHave))
        const cid = CID.createV0(hash).toString(base58btc)
        expect(msg.blockPresences.has(cid)).to.eql(true)
        expect(msg.blockPresences.get(cid)).to.eql(Message.BlockPresenceType.DontHave)
      }
    }
  })

  it('survives not being able to send a message to peer', async () => {
    /** @type {} */
    let r: Function
    const failToSendPromise = new Promise((resolve) => {
      r = resolve
    })

    const network = mockNetwork()
    network.sendMessage = () => {
      r()
      throw new Error('Something is b0rken')
    }

    // who is in the network
    const us = await newEngine(network)
    const them = await newEngine(mockNetwork())

    // add a block to our blockstore
    const data = uint8ArrayFromString(`this is message ${Date.now()}`)
    const hash = await sha256.digest(data)
    const cid = CID.createV0(hash)
    await us.engine.blockstore.put(cid, data)

    const message = new Message(false)
    message.addEntry(cid, 1, Message.WantType.Block, false, false)

    // receive a message with a want for our block
    await us.engine.messageReceived(them.peer, message)

    // should have added a task for the remote peer
    const tasks = us.engine._requestQueue._byPeer.get(them.peer.toString())

    expect(tasks).to.have.property('_pending').that.has.property('length', 1)

    // wait for us.network.sendMessage to be called
    await failToSendPromise

    // should be done processing
    expect(tasks).to.have.property('_pending').that.has.property('length', 0)
    expect(tasks).to.have.property('_active').that.has.property('size', 0)
  })
})
