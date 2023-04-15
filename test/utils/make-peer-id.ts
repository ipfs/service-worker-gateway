import type { PeerId } from '@libp2p/interface-peer-id'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'

export async function makePeerId (): Promise<PeerId> {
  return (await makePeerIds(1))[0]
}

export async function makePeerIds (count: number): Promise<PeerId[]> {
  const peerIds = await Promise.all([...new Array(count ?? 1)].map(async () => {
    return await createEd25519PeerId()
  }))
  return peerIds
}
