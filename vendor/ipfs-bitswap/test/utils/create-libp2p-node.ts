
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { createLibp2p, Libp2pOptions } from 'libp2p'
import { kadDHT } from '@libp2p/kad-dht'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { Libp2p } from '@libp2p/interface-libp2p'

// @ts-expect-error no types
import defaultsDeep from '@nodeutils/defaults-deep'

export interface NodeOptions extends Libp2pOptions {
  DHT?: boolean
}

export async function createLibp2pNode (options: NodeOptions = {}): Promise<Libp2p> {
  const node = await createLibp2p(defaultsDeep({
    peerId: await createEd25519PeerId(),
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [
      tcp()
    ],
    streamMuxers: [
      mplex()
    ],
    connectionEncryption: [
      noise()
    ],
    dht: options.DHT === true
      ? kadDHT({
        clientMode: false
      })
      : undefined
  }, options))

  await node.start()

  return node
}
