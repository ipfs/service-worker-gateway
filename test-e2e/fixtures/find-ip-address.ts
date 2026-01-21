import { networkInterfaces } from 'node:os'
import { isPrivateIp } from '@libp2p/utils'

/**
 * Find a class A, B or C IPv4 address for the current computer
 */
export function findIpAddress (): string | undefined {
  for (const addresses of Object.values(networkInterfaces())) {
    if (addresses == null) {
      continue
    }

    for (const address of addresses) {
      if (address.family !== 'IPv4') {
        continue
      }

      if (address.address === '127.0.0.1') {
        continue
      }

      if (isPrivateIp(address.address)) {
        return address.address
      }
    }
  }
}
