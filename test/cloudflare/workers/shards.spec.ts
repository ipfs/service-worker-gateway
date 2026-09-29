// Tests for badbits denylist parsing and sharding.

import { expect } from 'aegir/chai'
import { buildShards, changedPrefixes, parseDenylist, parseShard, shardHas, shardKey } from '../../../src/cloudflare/workers/gateway-edge/shards.ts'

const A = 'd9d295bde21f422d471a90f2a37ec53049fdf3e5fa3ee2e8f20e10003da429e7'
const B = 'd9d0000000000000000000000000000000000000000000000000000000000000'
const C = '3f8b9febd851873b3774b937cce126910699ceac56e72e64b866f8e258d09572'

describe('badbits shards', () => {
  describe('parseDenylist', () => {
    it('reads legacy entries after the header', () => {
      const list = `version: 1\nname: "test"\n---\n//${A}\n//${C}\n`
      expect(parseDenylist(list)).to.deep.equal({ hashes: [A, C], skipped: 0 })
    })

    it('treats a list without a header as all body', () => {
      expect(parseDenylist(`//${A}\n`).hashes).to.deep.equal([A])
    })

    it('ignores comments and blank lines', () => {
      expect(parseDenylist(`---\n# comment\n\n//${A}\n`)).to.deep.equal({ hashes: [A], skipped: 0 })
    })

    it('counts entries it does not enforce', () => {
      const list = `---\n//${A}\n/ipfs/bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e\n//QmX9dhRcQcKUw3Ws8485T5a9dtjrSCQaUAHnG4iK9i4ceM\n!//${C}\n`
      expect(parseDenylist(list)).to.deep.equal({ hashes: [A], skipped: 3 })
    })

    it('does not mistake a header value for an entry', () => {
      expect(parseDenylist(`description: "//${A}"\n---\n`).hashes).to.deep.equal([])
    })
  })

  describe('buildShards', () => {
    it('groups by the first three hex characters, sorted and deduplicated', () => {
      const shards = buildShards([A, C, B, A])
      expect([...shards.keys()]).to.deep.equal(['3f8', 'd9d'])
      expect(shards.get('d9d')).to.equal([B.slice(3), A.slice(3)].join('\n'))
    })

    it('is deterministic regardless of input order', () => {
      expect([...buildShards([A, B, C])]).to.deep.equal([...buildShards([C, B, A])])
    })

    it('round-trips through parseShard', () => {
      const shard = parseShard(buildShards([A, B]).get('d9d') ?? null)
      expect(shard.has(A.slice(3))).to.equal(true)
      expect(shard.has(B.slice(3))).to.equal(true)
    })
  })

  describe('shardHas', () => {
    const hashes = Array.from({ length: 200 }, (_, i) => 'abc' + i.toString(16).padStart(61, '0'))
    const value = buildShards(hashes).get('abc') ?? ''

    it('finds every entry of a shard by binary search', () => {
      for (const hash of hashes) {
        expect(shardHas(value, hash.slice(3))).to.equal(true)
      }
    })

    it('does not find absent entries, including neighbours and prefixes of entries', () => {
      expect(shardHas(value, 'f'.repeat(61))).to.equal(false)
      expect(shardHas(value, '0'.repeat(60) + 'g')).to.equal(false)
      expect(shardHas(value, hashes[0].slice(3, 20))).to.equal(false)
      expect(shardHas('', hashes[0].slice(3))).to.equal(false)
    })

    it('still finds an entry in a value that is not fixed width', () => {
      expect(shardHas(`short\n${hashes[5].slice(3)}`, hashes[5].slice(3))).to.equal(true)
    })
  })

  describe('parseShard', () => {
    it('treats a missing or empty value as an empty shard', () => {
      expect(parseShard(null).size).to.equal(0)
      expect(parseShard('').size).to.equal(0)
    })
  })

  describe('changedPrefixes', () => {
    it('reports new, changed and removed shards only', () => {
      expect(changedPrefixes({ aaa: '1', bbb: '2', ccc: '3' }, { aaa: '1', bbb: 'x', ddd: '4' }))
        .to.deep.equal(['bbb', 'ccc', 'ddd'])
    })
  })

  it('namespaces KV keys', () => {
    expect(shardKey('abc')).to.equal('bb:abc')
  })
})
