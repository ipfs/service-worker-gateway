import { blake3 as b3 } from '@noble/hashes/blake3'
import { from } from 'multiformats/hashes/hasher'

export const blake3 = from({
  name: 'blake3',
  code: 0x1e,
  encode: (input) => b3(input)
})
