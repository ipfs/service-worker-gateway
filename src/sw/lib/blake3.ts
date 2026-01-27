import { blake3 as b3 } from '@noble/hashes/blake3.js'
import { from } from 'multiformats/hashes/hasher'
import { CODE_BLAKE3 } from '../../ui/pages/multicodec-table.ts'

export const blake3 = from({
  name: 'blake3',
  code: CODE_BLAKE3,
  encode: (input) => b3(input)
})
