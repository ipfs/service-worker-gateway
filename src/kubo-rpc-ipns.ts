import { logger } from '@libp2p/logger'
import type { PeerId } from '@libp2p/interface-peer-id'
import * as ipns from 'ipns'
import * as ipnsValidator from 'ipns/validator'
import { peerIdFromString } from '@libp2p/peer-id'

const log = logger('ipns:delegated-ipns-resolution')

export async function GetDNSLinkOrIPNS (key: string): Promise<string> {
  if (key.includes('.')) {
    return await GetDNSLink(key)
  }
  const id = peerIdFromString(key)
  return await GetIPNS(id)
}

export async function GetDNSLink (domain: string): Promise<string> {
  const reqUrl = `https://node3.delegate.ipfs.io/api/v0/name/resolve/${domain}?r=false`
  // abort in 1 second
  const controller = new AbortController()
  setTimeout(() => { controller.abort() }, 5000)

  log.trace('starting delegated IPNS fetch')
  const response = await fetch(reqUrl, {
    signal: controller.signal,
    method: 'POST'
  })
  const result = await response.json()
  return result.Path
}

export async function GetIPNS (id: PeerId): Promise<string> {
  const reqUrl = `https://node3.delegate.ipfs.io/api/v0/dht?arg=/ipns/${id.toString()}`
  // abort in 1 second
  const controller = new AbortController()
  setTimeout(() => { controller.abort() }, 5000)

  log.trace('starting delegated IPNS fetch')
  const response = await fetch(reqUrl, {
    signal: controller.signal,
    method: 'POST'
  })
  const b = await (await response.blob()).arrayBuffer()
  const bytesView = new Uint8Array(b)
  const entry = ipns.unmarshal(bytesView)
  const routingKey = ipns.peerIdToRoutingKey(id)
  await ipnsValidator.ipnsValidator(routingKey, bytesView)
  return entry.value.toString()
}
