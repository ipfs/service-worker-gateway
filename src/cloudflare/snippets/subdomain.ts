import { CODE_LIBP2P_KEY } from '../../ui/pages/multicodec-table.ts'
import { cidV1Bytes, parseCID } from './cid.ts'
import { base32Encode, base36Encode } from './codec.ts'
import { dnsLinkEncode } from './dnslink.ts'

export function toSubdomain (identifier: string, namespace: string): string | undefined {
  if (namespace === 'ipfs') {
    try {
      const parsed = parseCID(identifier)
      const v1 = parsed.version === 0 ? cidV1Bytes(parsed.codec, parsed.multihash) : parsed.raw

      return 'b' + base32Encode(v1)
    } catch {}
  } else if (namespace === 'ipns') {
    try {
      const parsed = parseCID(identifier)

      const v1 = parsed.version === 0 ? cidV1Bytes(CODE_LIBP2P_KEY, parsed.multihash) : parsed.raw
      return 'k' + base36Encode(v1)
    } catch {
      // DNSLink domain name
      return dnsLinkEncode(identifier)
    }
  }
}
