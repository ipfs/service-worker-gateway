import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { randomBytes } from 'iso-random-stream'
// @ts-expect-error no types
import range from 'lodash.range'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
// @ts-expect-error no types
import { v4 as uuid } from 'uuid'

export const makeBlocks = async (count: number, size?: number): Promise<Array<{ cid: CID, block: Uint8Array }>> => {
  const blocks = await Promise.all(
    range(count ?? 1).map(async () => {
      const block = size != null ? randomBytes(size) : uint8ArrayFromString(`hello world ${uuid()}`)
      const hash = await sha256.digest(block)
      return {
        cid: CID.createV0(hash),
        block
      }
    })
  )

  return blocks
}
