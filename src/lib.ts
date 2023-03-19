// import { createPeerId } from '@libp2p/peer-id'
import type { PeerId } from '@libp2p/interface-peer-id'
// import { create as createMultihashDigest } from 'multiformats/hashes/digest'

export function mergeUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const c = new Uint8Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
}

function peerIdSerializer(peerId: PeerId): string {
  const id = peerId.toString();
  const privateKey = peerId.privateKey?.toString()

  return JSON.stringify({
    id,
    privateKey,
    type: peerId.type,
    multihash: JSON.stringify({code: peerId.multihash.code, size: peerId.multihash.size, digest: peerId.multihash.digest.toString(), bytes: peerId.multihash.bytes.toString()} )
  });
}
export function persistPeerId(peerId: PeerId): void {
  localStorage.setItem("peerId", peerIdSerializer(peerId));
}

export function getExistingPeerId(): PeerId | undefined {
  // const peerId = localStorage.getItem("peerId");
  // if (peerId) {
  //   const peerIdJson = JSON.parse(peerId);
  //   try {
  //     const multiHashJson = peerIdJson.multihash;
  //     console.log(`multiHashJson: `, multiHashJson);
  //     return createPeerId({
  //       // id: peerId,\
  //       type: peerIdJson.type,
  //       multihash: createMultihashDigest(multiHashJson.code, Uint8Array.from(multiHashJson.digest)),
  //       privateKey: Uint8Array.from(peerIdJson.privateKey),

  //     });
  //   } catch (e) {
  //     console.error(e);
  //   }
  // }
  return undefined;
}
