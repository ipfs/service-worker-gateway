import type { Blockstore } from 'interface-blockstore'
import { MemoryBlockstore } from 'blockstore-core/memory'
import { EventEmitter } from 'events'
import { DefaultBitswap } from '../../src/bitswap.js'
import { Network } from '../../src/network.js'
import { Stats } from '../../src/stats/index.js'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { createLibp2pNode } from './create-libp2p-node.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Libp2p } from '@libp2p/interface-libp2p'
import type { CID } from 'multiformats/cid'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Connection } from '@libp2p/interface-connection'
import type { BitswapMessage } from '../../src/message/index.js'
import type { Bitswap } from '../../src/index.js'

/**
 * Create a mock libp2p node
 */
export const mockLibp2pNode = (): Libp2p => {
  const buf = uint8ArrayFromString('122019318b6e5e0cf93a2314bf01269a2cc23cd3dcd452d742cdb9379d8646f6e4a9', 'base16')
  const peerId = peerIdFromBytes(buf)

  const libp2p = Object.assign(new EventEmitter(), {
    peerId,
    multiaddrs: [],
    handle () {},
    unhandle () {},
    register () {},
    unregister () {},
    contentRouting: {
      provide: async (cid: CID) => {}, // eslint-disable-line require-await
      findProviders: async (cid: CID, timeout: number) => { return [] } // eslint-disable-line require-await
    },
    connectionManager: {
      on () {},
      removeListener () {}
    },
    async dial (peer: PeerId) { // eslint-disable-line require-await
    },
    async dialProtocol (peer: PeerId, protocol: string) { // eslint-disable-line require-await
      return {}
    },
    swarm: {
      setMaxListeners () {}
    },
    getConnections: () => []
  })

  // @ts-expect-error not all libp2p fields are implemented
  return libp2p
}

interface OnDone {
  (args: { connects: Array<PeerId | Multiaddr>, messages: Array<[PeerId, BitswapMessage]> }): void
}

interface OnMessage {
  (peerId: PeerId, message: BitswapMessage): void
}

/**
 * Create a mock network instance
 */
export const mockNetwork = (calls: number = Infinity, done: OnDone = async (): Promise<void> => {}, onMsg: OnMessage = async (): Promise<void> => {}): Network => {
  const connects: Array<PeerId | Multiaddr> = []
  const messages: Array<[PeerId, BitswapMessage]> = []
  let i = 0

  const finish = (peerId: PeerId, message: BitswapMessage): void => {
    onMsg?.(peerId, message)

    if (++i === calls) {
      done?.({ connects, messages })
    }
  }

  class MockNetwork extends Network {
    public connects: Array<PeerId | Multiaddr>
    public messages: Array<[PeerId, BitswapMessage]>

    constructor () {
      // @ts-expect-error - {} is not an instance of libp2p
      super({}, new DefaultBitswap({}, new MemoryBlockstore()), new Stats({}))

      this.connects = connects
      this.messages = messages
    }

    async connectTo (p: PeerId | Multiaddr): Promise<Connection> {
      setTimeout(() => {
        connects.push(p)
      })

      // @ts-expect-error not all connection fields are implemented
      return await Promise.resolve({ id: '', remotePeer: '' })
    }

    async sendMessage (p: PeerId, msg: BitswapMessage): Promise<void> {
      messages.push([p, msg])

      setTimeout(() => {
        finish(p, msg)
      })

      await Promise.resolve()
    }

    async start (): Promise<void> {
      await Promise.resolve()
    }

    async stop (): Promise<void> {
      await Promise.resolve()
    }

    async findAndConnect (): Promise<void> {
      await Promise.resolve()
    }

    async provide (): Promise<void> {
      await Promise.resolve()
    }
  }

  return new MockNetwork()
}

export const applyNetwork = (bs: DefaultBitswap, n: Network): void => {
  bs.network = n
  bs.wm.network = n
  bs.engine.network = n
}

export interface BitswapNode {
  libp2p: Libp2p
  bitswap: Bitswap
  blockstore: Blockstore
}

export const genBitswapNetwork = async (n: number, enableDHT: boolean = false): Promise<BitswapNode[]> => {
  // create PeerId and libp2p.Node for each
  const peers = await Promise.all(
    new Array(n).fill(0).map(async () => await createEd25519PeerId())
  )

  /** @type {{ libp2p: Libp2p, bitswap: Bitswap }[]} */
  const netArray = await Promise.all(
    peers.map(async (peerId, i) => {
      const libp2p = await createLibp2pNode({
        peerId,
        DHT: enableDHT,
        nat: {
          enabled: false
        }
      })

      await libp2p.start()

      const blockstore = new MemoryBlockstore()

      return {
        libp2p,
        bitswap: new DefaultBitswap(libp2p, blockstore),
        blockstore
      }
    })
  )

  // populate peerStores
  for (let i = 0; i < netArray.length; i++) {
    const netA = netArray[i]

    for (let j = 0; j < netArray.length; j++) {
      if (i === j) {
        continue
      }

      const netB = netArray[j]

      await netA.libp2p.peerStore.addressBook.set(netB.libp2p.peerId, netB.libp2p.getMultiaddrs())
    }
  }

  return netArray
}
