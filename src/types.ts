import type { multiaddr } from '@multiformats/multiaddr'
import type { Libp2pInit } from 'libp2p'

export type Libp2pConfigTypes = 'ipni' | 'dht'
export type Multiaddr = ReturnType<typeof multiaddr>

// libp2p does not export components externally... ideally we would do: import type { Components } from 'libp2p'
export type LibP2pComponents = Parameters<(Required<Libp2pInit['peerRouters']> extends infer K
  ? K extends undefined ? never : K
  : never)[0]>[0]

export interface CustomRoutingEventType {
  Metadata: string // gBI= means bitswap

}
export interface IpniResponseItem extends CustomRoutingEventType {
  ContextID: string
  Provider: {
    ID: string
    Addrs: Multiaddr[]
  }
}

export interface ReframeV1ResponseItem extends CustomRoutingEventType {
  ID: string
  Addrs: Multiaddr[]
  Protocol: string
  Schema: string
}

export interface HTTPClientExtraOptions {
  headers?: Record<string, string>
  searchParams?: URLSearchParams
}
