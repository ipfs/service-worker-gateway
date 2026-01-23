import { isPeerId } from '@libp2p/interface'
import { CID } from 'multiformats/cid'
import type { PeerId } from '@libp2p/interface'

/**
 * @see https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-4
 */
export const DNS_TYPES: Record<string, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  MX: 15,
  TXT: 16,
  AAAA: 28
}

export interface DNSRecord {
  type: number
  data: string
  expires: number
}

export function toResourceRecordType (type?: string | number): number | undefined {
  if (type == null) {
    return
  }

  if (typeof type === 'number') {
    if (!Object.values(DNS_TYPES).includes(type)) {
      throw new Error(`Numeric type "${type}" invalid or unsupported`)
    }

    return type
  }

  type = DNS_TYPES[type]

  if (type == null) {
    throw new Error(`Could not convert "${type}" into numeric type`)
  }

  return type
}

export class DNSRecordCache {
  private records: Map<string, DNSRecord[]>

  constructor () {
    this.records = new Map()
  }

  delete (domain: string | string[]): void {
    if (Array.isArray(domain)) {
      domain.forEach(domain => {
        this.records.delete(domain)
      })
    } else {
      this.records.delete(domain)
    }
  }

  put (domain: string, type: string | number, data: string, ttl?: number): void {
    domain = domain.toLowerCase()
    type = toResourceRecordType(type) ?? DNS_TYPES.A
    ttl = ttl ?? 60_000

    const records = this.get(domain)

    records.push({
      type,
      data,
      expires: Date.now() + ttl
    })

    this.records.set(domain.toLowerCase(), records)
  }

  get (domain: string, type?: string | number): DNSRecord[] {
    domain = domain.toLowerCase()
    type = toResourceRecordType(type)

    let records = this.records.get(domain)

    if (records != null) {
      records = records.filter(record => record.expires > Date.now())

      if (records.length === 0) {
        this.delete(domain)
      } else {
        this.records.set(domain, records)
      }

      if (type !== null) {
        records = records.filter(record => record.type === type)
      }
    }

    return records ?? []
  }
}

export async function publishDNSLink (domain: string, record: string | CID | PeerId): Promise<void> {
  let data = ''

  if (isPeerId(record)) {
    data = `"dnslink=/ipns/${record.toString()}"`
  } else if (CID.asCID(record) === record || record instanceof CID) {
    data = `"dnslink=/ipfs/${record.toString()}"`
  } else {
    data = `"dnslink=${record}"`
  }

  await fetch(`${process.env.TEST_API_SERVER}/dns-record/_dnslink.${domain}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      type: 'TXT',
      data
    })
  })
}
