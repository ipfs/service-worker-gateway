import * as varint from 'varint'

function varintEncoder (buf: number[]): Uint8Array {
  let out = new Uint8Array(buf.reduce((acc, curr) => {
    // @ts-expect-error types are wrong
    return acc + varint.default.encodingLength(curr) // eslint-disable-line @typescript-eslint/restrict-plus-operands
  }, 0))
  let offset = 0

  for (const num of buf) {
    out = varint.encode(num, out, offset)

    // @ts-expect-error types are wrong
    offset += varint.default.encodingLength(num) // eslint-disable-line @typescript-eslint/restrict-plus-operands
  }

  return out
}

export default varintEncoder
