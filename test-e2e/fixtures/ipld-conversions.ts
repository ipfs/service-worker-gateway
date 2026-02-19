import * as cbor from 'cborg'
import * as json from 'multiformats/codecs/json'
import type { Response } from 'playwright'

interface IPLDConversion {
  format: string
  mediaType: string
  decode(response: Response): Promise<any>
  filename(cid: any): string
  disposition: 'attachment' | 'inline'
}

export const IPLD_CONVERSIONS: IPLDConversion[] = [{
  format: 'cbor',
  mediaType: 'application/cbor',
  decode: async (response: Response) => cbor.decode(await response?.body()),
  filename: (cid: any) => `filename="${cid}.cbor"`,
  disposition: 'attachment'
}, {
  format: 'json',
  mediaType: 'application/json',
  decode: async (response: Response) => json.decode(await response?.body()),
  filename: (cid: any) => `filename="${cid}.json"`,
  disposition: 'attachment'
}]
