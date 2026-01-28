import { isIP } from '@chainsafe/is-ip'

export const isSafeOrigin = (location: Pick<Location, 'hostname'>): boolean => {
  return !isIP(location.hostname)
}
