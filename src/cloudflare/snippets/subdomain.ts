import { cidV1Bytes, parseCID } from './cid.ts'
import { base32Encode, base36Encode } from './codec.ts'
import { dnsLinkEncode } from './dnslink.ts'

export function toSubdomain (identifier: string, namespace: string): string | undefined {
  if (namespace === 'ipfs') {
    const parsed = parseCID(identifier)

    if (!parsed) {
      return
    }

    const v1 = parsed.version === 0 ? cidV1Bytes(0x70, parsed.multihash) : parsed.raw

    return 'b' + base32Encode(v1)
  } else if (namespace === 'ipns') {
    if (identifier.includes('.')) {
      // DNSLink domain name
      return dnsLinkEncode(identifier)
    } else {
      const parsed = parseCID(identifier)

      if (!parsed) {
        return
      }

      const v1 = parsed.version === 0 ? cidV1Bytes(0x72, parsed.multihash) : parsed.raw
      return 'k' + base36Encode(v1)
    }
  }
}
