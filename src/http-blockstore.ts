import type { Blockstore, Pair } from 'interface-blockstore'
import type { Connection } from '@libp2p/interface-connection'
import type {
  AbortOptions,
  Await,
  AwaitIterable
} from 'interface-store'
import type { Libp2p } from 'libp2p'
import type { CID } from 'multiformats/cid'
import { fetchViaDuplex } from '@marcopolo_/libp2p-fetch'

// TODOS:
// - Validate the blocks we fetch
// - Use format=car to get the whole dag at once rather than per block (probably faster?)
// - Keep a list of HTTPS endpoints, not just libp2p peers.
// - Keep a list of previous peers we were connected to, so even if we lose a webtransport connection, we can spin it up later.

export class HttpBlockstore implements Blockstore {
  private peersWithHttpOverLibp2p: Connection[] = []
  constructor (private readonly innerBlockstore: Blockstore, libp2p: Libp2p) {
    libp2p.addEventListener('peer:connect', (connEvent) => {
      // TODO check if they support http over libp2p and the ipfs gateway api
      const conn = connEvent.detail
      this.peersWithHttpOverLibp2p.push(conn)
    })
    libp2p.addEventListener('peer:disconnect', (connEvent) => {
      const conn = connEvent.detail
      this.peersWithHttpOverLibp2p = this.peersWithHttpOverLibp2p.filter((c) => c !== conn)
    })
  }

  getAll (): AwaitIterable<Pair> {
    return this.innerBlockstore.getAll()
  }

  async has (key: CID, options?: AbortOptions): Promise<boolean> {
    const innerHas = await this.innerBlockstore.has(key, options)
    if (innerHas) {
      return true
    }

    for (const connection of this.peersWithHttpOverLibp2p) {
      // TODO unsure how to wait for identify to finish, just trying to see if it works
      // const protos = await this.libp2p.peerStore.protoBook.get(connection.remotePeer)
      // if (!protos.includes('/libp2p-http')) {
      //   // TODO remove from peersWithHttpOverLibp2p
      //   continue
      // }

      try {
        const s = await connection.newStream('/libp2p-http')
        const fetch = fetchViaDuplex(s)
        const resp = await fetch(new Request(`https://example.com/ipfs/${key.toString()}/`, { method: 'HEAD' }))
        if (resp.ok) {
          console.log('HTTP Blockstore has it!', key.toString(), 'via libp2p')
          return true
        }
      } catch (err) {
        console.warn('http over libp2p err', err)
        continue
      }
    }

    return false
  }

  put (key: CID, val: Uint8Array, options?: AbortOptions): Await<CID> {
    return this.innerBlockstore.put(key, val, options)
  }

  putMany (source: AwaitIterable<Pair>, options?: AbortOptions): AwaitIterable<CID> {
    return this.innerBlockstore.putMany(source, options)
  }

  delete (key: CID, options?: AbortOptions): Await<void> {
    return this.innerBlockstore.delete(key, options)
  }

  deleteMany (source: AwaitIterable<CID>, options?: AbortOptions): AwaitIterable<CID> {
    return this.innerBlockstore.deleteMany(source, options)
  }

  async get (key: CID, options?: AbortOptions): Promise<Uint8Array> {
    if (await this.innerBlockstore.has(key, options)) {
      return await this.innerBlockstore.get(key, options)
    }

    for (const connection of this.peersWithHttpOverLibp2p) {
      try {
        const s = await connection.newStream('/libp2p-http')
        const fetch = fetchViaDuplex(s)
        const resp = await fetch(new Request(`https://example.com/ipfs/${key.toString()}/?format=raw`))
        if (resp.ok) {
          const ab = (await resp.arrayBuffer())
          await this.innerBlockstore.put(key, new Uint8Array(ab))
          return new Uint8Array(ab)
        }
      } catch (err) {
        console.warn('http over libp2p err', err)
        continue
      }
    }
    return await this.innerBlockstore.get(key, options)
  }

  getMany (source: AwaitIterable<CID>, options?: AbortOptions): AwaitIterable<Pair> {
    return this.innerBlockstore.getMany(source, options)
  }
}
