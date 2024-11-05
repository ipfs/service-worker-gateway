import { blake3 as b3 } from '@noble/hashes/blake3'
import { from } from 'multiformats/hashes/hasher'

export const blake3 = from({
  name: 'blake3',
  code: 0x1e, // Code for blake3 from https://github.com/multiformats/multicodec/blob/352d05ad430713088e867216152725f581387bc8/table.csv#L21
  encode: (input) => b3(input)
})
