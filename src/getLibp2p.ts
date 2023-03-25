import type { Libp2p, Libp2pOptions } from 'libp2p'
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'

import type { LibP2pComponents, Libp2pConfigTypes } from './types.ts'
import { getIpniLibp2pConfig } from './libp2pConfigs/getIpniLibp2pConfig.ts'
import { getDhtLibp2pConfig } from './libp2pConfigs/getDhtLibp2pConfig.ts'

interface GetLibP2pOptions {
  datastore: LibP2pComponents['datastore']
  type: Libp2pConfigTypes
}

const typeFnMap: Record<GetLibP2pOptions['type'], () => Libp2pOptions> = {
  ipni: getIpniLibp2pConfig,
  dht: getDhtLibp2pConfig
}

export async function getLibp2p ({ datastore, type }: GetLibP2pOptions): Promise<Libp2p> {
  return await createLibp2p({
    datastore,
    transports: [
      webSockets(),
      webTransport()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux(),
      mplex() // required to prevent `libp2p:dialer:error dial to /dns4/elastic.dag.house/tcp/443/wss/p2p/QmQzqxhK82kAmKvARFZSkUVS6fo9sySaiogAnx5EnZ6ZmC failed +0ms Error: protocol selection failed`
    ],
    ...typeFnMap[type]()
  })
}
