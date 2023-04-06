import type { Helia } from '@helia/interface'

const peerConnectionHistory = new Map<string, Set<string>>()

/**
 * Display various connectivity debugging information
 *
 * You can pass a delay to this function to have it run repeatedly, when
 * finished, after delay milliseconds
 */
export async function displayConnectivityInfo ({ helia, delay }: { helia: Helia, delay: number }): Promise<void> {
  helia.libp2p.addEventListener('peer:discovery', (evt) => {
    console.log(`Discovered peer ${evt.detail.id.toString()}`)
  })

  helia.libp2p.addEventListener('peer:connect', (evt) => {
    console.log(`Connected to ${evt.detail.remotePeer.toString()}`)
  })

  helia.libp2p.addEventListener('peer:disconnect', (evt) => {
    console.log(`Disconnected from ${evt.detail.remotePeer.toString()}`)
  })
  // @ts-expect-error - broken types
  const totalPeerPromise = helia.libp2p.components.peerStore.all()
  for (const connection of helia.libp2p.getConnections()) {
    const peerString = connection.remotePeer.toString()
    const addrString = connection.remoteAddr.toString()
    const peerHistory = peerConnectionHistory.get(peerString)
    if (peerHistory == null) {
      peerConnectionHistory.set(peerString, new Set())
    } else {
      if (!peerHistory.has(addrString)) {
        peerHistory.add(addrString)
        peerConnectionHistory.set(peerString, peerHistory)
        console.log(`Connected to new peer-addr pair: ${peerString} at ${addrString}`)
      }
    }
  }
  console.log(`Unique count of past connected peers: ${peerConnectionHistory.size}`)
  await totalPeerPromise.then((currentPeers) => {
    // currentPeers.forEach((p) => {
    //   console.log('peerStore peer: ', p.id.toString())
    // })
    console.log('total peers: ', currentPeers.length)
    setTimeout(() => { void displayConnectivityInfo({ helia, delay }) }, delay)
  })
  // currentPeers.forEach((p) => {

  //     console.log('peerStore peer: ', p.id.toString())
  // })
  // console.log('total peers: ', currentPeers)

  // setTimeout((): void => {
  //   void (async (): Promise<void> => {
  //     for await (const queryEvent of libp2p.dht.findProviders(CID.parse('bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq'))) {
  //       console.log('findProviders for video/webm CID queryEvent: ', queryEvent)
  //     }

  //     for await (const p of helia.libp2p.dht.getClosestPeers(peerIdFromPeerId(helia.libp2p.peerId).multihash.bytes)) {
  //       console.log('getClosest peers response: ', p)
  //     }
  //   })()
  // }, 20000)
}
