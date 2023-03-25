import { logger } from '@libp2p/logger'
import defer from 'p-defer'
import anySignal from 'any-signal'
import type { AbortOptions } from '@libp2p/interfaces'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { CID } from 'multiformats/cid'
import HTTP from 'ipfs-utils/src/http.js'

import type { HTTPClientExtraOptions, LibP2pComponents, Multiaddr, ReframeV1ResponseItem } from './types.ts'
import { AbortSignalGuard } from './typeGuards.ts'
import { CustomRouting } from './CustomRouting.ts'

const log = logger('libp2p:delegated-content-routing')

/**
 * An implementation of content routing, using a delegated peer
 */
class ReframeV1Routing extends CustomRouting<ReframeV1ResponseItem> {
  /**
   * Create a new DelegatedContentRouting instance
   */
  constructor (protocol: string, host: string, port: string) {
    super(protocol, host, port)

    log(`enabled IPNI routing via ${protocol}://${host}:${port}`)
  }

  getPeerIdFromEvent (event: ReframeV1ResponseItem): string {
    return event.ID
  }

  getMultiaddrsFromEvent (event: ReframeV1ResponseItem): Multiaddr[] {
    return event.Addrs
  }

  /**
   * Search the dht for providers of the given CID.
   *
   * - call `findProviders` on the delegated node.
   */
  async * findProviders (key: CID, options: HTTPClientExtraOptions & AbortOptions = {}): AsyncIterable<PeerInfo> {
    log('findProviders starts: %c', key)
    options.signal = anySignal([this.abortController.signal].concat(AbortSignalGuard(options.signal) ? [options.signal] : []))
    setTimeout(() => {
      this.abortController.abort('findProviders timed out')
    }, this.DEFAULT_TIMEOUT)

    const onStart = defer()
    const onFinish = defer()

    void this.httpQueue.add(async () => {
      onStart.resolve()
      return await onFinish.promise
    })

    try {
      await onStart.promise

      const resource = `${this.clientUrl}routing/v1/providers/${key.toString()}`
      const getOptions = { headers: { Accept: 'application/x-ndjson' }, signal: this.abortController.signal }
      const a = await HTTP.get(resource, getOptions)
      const b: AsyncGenerator<ReframeV1ResponseItem, unknown, unknown> = a.ndjson()
      for await (const event of b) {
        if (event.Protocol !== 'transport-bitswap' || event.Schema !== 'bitswap') {
          continue
        }

        console.log(event)
        yield this.mapEvent(event)
      }
    } catch (err) {
      log.error('findProviders errored:', err)
      throw err
    } finally {
      onFinish.resolve()
      log('findProviders finished: %c', key)
    }
  }
}

export function reframeV1Routing (protocol: string, host: string, port: string): (components?: LibP2pComponents) => ContentRouting {
  return () => new ReframeV1Routing(protocol, host, port)
}
