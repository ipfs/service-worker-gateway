import { peerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats'
import { identity } from 'multiformats/hashes/identity'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { CODE_RAW } from '../src/ui/pages/multicodec-table.ts'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
import { publishDNSLink } from './fixtures/serve/dns-record-cache.ts'

test.describe('DNSLink', () => {
  test('should load a DNSLink record', async ({ page, baseURL }) => {
    const domain = 'ipns-happy-path.com'
    const cid = CID.createV1(CODE_RAW, identity.digest(uint8ArrayFromString('hello world')))

    await publishDNSLink(domain, cid)

    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)

    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello world')
  })

  test('should load a DNSLink record with a path', async ({ page, baseURL }) => {
    const domain = 'ipns-with-path.com'
    const cid = CID.parse('bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui')
    const path = 'root2/root3/root4'

    await publishDNSLink(domain, cid)

    // TODO: use rootDomain
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}/${path}`)

    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello')
  })

  test('should load a DNSLink record that resolves to an IPNS name', async ({ page, baseURL }) => {
    const name = 'k51qzi5uqu5dhjghbwdvbo6mi40htrq6e2z4pwgp15pgv3ho1azvidttzh8yy2'
    const cid = 'baguqeeram5ujjqrwheyaty3w5gdsmoz6vittchvhk723jjqxk7hakxkd47xq'
    const peerId = peerIdFromString(name)
    const domain = 'recursive-dnslink.com'

    await publishDNSLink(domain, peerId)

    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers?.['content-type']).toContain('application/vnd.ipld.dag-json')
    expect(headers?.['cache-control']).toBe('public, max-age=60')
    expect(headers?.['etag']).toBe(`"${cid}.dag-json"`)
    expect(headers?.['x-ipfs-path']).toBe(`/ipns/${domain}`)

    expect(await response?.json()).toStrictEqual({
      foo: {
        link: {
          '/': 'baguqeeraxpdqyfizawpb7zl5gnpg7jw3myuynb42ngzmeo7xn5kmm5pabt6q'
        },
        object: {
          banana: 10,
          monkey: false
        }
      }
    })
  })
})
