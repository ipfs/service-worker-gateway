import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
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
  format: 'dag-cbor',
  mediaType: 'application/vnd.ipld.dag-cbor',
  decode: async (response: Response) => dagCbor.decode(await response?.body()),
  filename: (cid: any) => `filename="${cid}.cbor"`,
  disposition: 'attachment'
}, {
  format: 'json',
  mediaType: 'application/json',
  decode: async (response: Response) => json.decode(await response?.body()),
  filename: (cid: any) => `filename="${cid}.json"`,
  disposition: 'attachment'
}, {
  format: 'dag-json',
  mediaType: 'application/vnd.ipld.dag-json',
  decode: async (response: Response) => dagJson.decode(await response?.body()),
  filename: (cid: any) => `filename="${cid}.json"`,
  disposition: 'attachment'
}]
