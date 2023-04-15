/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { BitswapMessageEntry } from '../src/message/entry.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { BitswapMessage } from '../src/message/index.js'

import { groupBy, uniqWith, pullAllWith, includesWith, sortBy, isMapEqual } from '../src/utils/index.js'
import { SortedMap } from '../src/utils/sorted-map.js'
import varintEncoder from '../src/utils/varint-encoder.js'
// @ts-expect-error no types
import varintDecoder from 'varint-decoder'

const DAG_PB_CODEC = 0x70

describe('utils spec', function () {
  it('groupBy', () => {
    const list = [
      { name: 'name1', score: 1 },
      { name: 'name2', score: 1 },
      { name: 'name3', score: 2 }
    ]
    const actual = groupBy(p => p.score === 1 ? 'a' : 'b', list)

    expect(actual).to.deep.equal({
      a: [
        { name: 'name1', score: 1 },
        { name: 'name2', score: 1 }
      ],
      b: [{ name: 'name3', score: 2 }]
    })
  })

  it('pullAllWith', () => {
    const array = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }]

    const actual = pullAllWith(
      (a, b) => (a.x === b.x && a.y === b.y),
      array,
      [{ x: 3, y: 4 }]
    )

    expect(actual).to.deep.equal([{ x: 1, y: 2 }, { x: 5, y: 6 }])
  })

  it('uniqWith', () => {
    class T {
      public id: number

      constructor (id: number) {
        this.id = id
      }

      equals (instance: T): boolean {
        return instance.id === this.id
      }
    }
    const list = [new T(1), new T(1), new T(2)]

    const r = uniqWith((a, b) => a.equals(b), list)

    if (r[0].id === 1 && r[1].id === 2) {
      return
    }

    throw new Error('no match')
  })

  it('includesWith', () => {
    class T {
      public id: number

      constructor (id: number) {
        this.id = id
      }

      equals (instance: T): boolean {
        return instance.id === this.id
      }
    }
    const list = [new T(1), new T(2), new T(3)]

    const r1 = includesWith((a, b) => a.equals(b), new T(2), list)
    const r2 = includesWith((a, b) => a.equals(b), new T(4), list)
    expect(r1).to.be.true()
    expect(r2).to.be.false()
  })

  it('sortBy', () => {
    const list = [
      {
        id: 3,
        name: 'b'
      },
      {
        id: 2,
        name: 'a'
      },
      {
        id: 1,
        name: 'c'
      }
    ]

    const groupedList1 = sortBy(o => o.name.charCodeAt(0), list)
    const groupedList2 = sortBy(o => o.id, list)

    expect(groupedList1).to.be.deep.equal([{ id: 2, name: 'a' },
      { id: 3, name: 'b' },
      { id: 1, name: 'c' }])
    expect(groupedList2).to.be.deep.equal([{ id: 1, name: 'c' },
      { id: 2, name: 'a' },
      { id: 3, name: 'b' }])
  })

  describe('isMapEqual', () => {
    it('should on be false when !== size', () => {
      expect(isMapEqual(
        new Map([['key1', uint8ArrayFromString('value1')], ['key2', uint8ArrayFromString('value2')]]),
        new Map([['key1', uint8ArrayFromString('value1')]])
      )).to.be.false()
    })

    it('should on be false if one key is missing', () => {
      expect(isMapEqual(
        new Map([['key1', uint8ArrayFromString('value1')], ['key2', uint8ArrayFromString('value2')]]),
        new Map([['key1', uint8ArrayFromString('value1')], ['key3', uint8ArrayFromString('value2')]])
      )).to.be.false()
    })

    it('should on be false if BitswapMessageEntry don\'t match', async () => {
      const hash1 = await sha256.digest(uint8ArrayFromString('OMG!1'))
      const cid1 = CID.createV1(DAG_PB_CODEC, hash1)

      expect(isMapEqual(
        new Map([['key1', new BitswapMessageEntry(cid1, 1, BitswapMessage.WantType.Block)], ['key2', new BitswapMessageEntry(cid1, 2, BitswapMessage.WantType.Block)]]),
        new Map([['key1', new BitswapMessageEntry(cid1, 1, BitswapMessage.WantType.Block)], ['key2', new BitswapMessageEntry(cid1, 1, BitswapMessage.WantType.Block)]])
      )).to.be.false()
    })

    it('should on be true if BitswapMessageEntry match', async () => {
      const hash1 = await sha256.digest(uint8ArrayFromString('OMG!1'))
      const cid1 = CID.createV1(DAG_PB_CODEC, hash1)

      expect(isMapEqual(
        new Map([['key1', new BitswapMessageEntry(cid1, 1, BitswapMessage.WantType.Block)], ['key2', new BitswapMessageEntry(cid1, 1, BitswapMessage.WantType.Block)]]),
        new Map([['key1', new BitswapMessageEntry(cid1, 1, BitswapMessage.WantType.Block)], ['key2', new BitswapMessageEntry(cid1, 1, BitswapMessage.WantType.Block)]])
      )).to.be.true()
    })

    it('should on be false if data does not match', async () => {
      const block1 = uint8ArrayFromString('hello world')
      const block2 = uint8ArrayFromString('hello world 2')

      expect(isMapEqual(
        new Map([['key1', block1], ['key2', block1]]),
        new Map([['key1', block1], ['key2', block2]])
      )).to.be.false()
    })

    it('should on be true if data matches', async () => {
      const data = uint8ArrayFromString('hello world')

      expect(isMapEqual(
        new Map([['key1', data], ['key2', data]]),
        new Map([['key1', data], ['key2', data]])
      )).to.be.true()
    })
  })

  describe('SortedMap', () => {
    it('size', () => {
      const sm = new SortedMap<string, number>()
      sm.set('one', 1)
      sm.set('two', 2)
      sm.set('three', 3)

      expect(sm.size).to.eql(3)
    })

    it('get / set', () => {
      const sm = new SortedMap<string, number>()
      sm.set('one', 1)
      sm.set('two', 2)
      sm.set('three', 3)

      expect(sm.get('one')).to.eql(1)
      expect(sm.get('two')).to.eql(2)
      expect(sm.get('three')).to.eql(3)
    })

    it('delete', () => {
      const sm = new SortedMap<string, number>()
      sm.set('one', 1)
      sm.set('two', 2)
      sm.set('three', 3)

      expect(sm.get('two')).to.eql(2)

      sm.delete('two')

      expect(sm.get('two')).to.be.undefined()
      expect(sm.size).to.eql(2)

      sm.delete('two')
      expect(sm.size).to.eql(2)
    })

    it('clear', () => {
      const sm = new SortedMap<string, number>()
      sm.set('one', 1)
      sm.set('two', 2)
      sm.set('three', 3)

      expect(sm.get('two')).to.eql(2)

      sm.clear()

      expect(sm.get('two')).to.be.undefined()
      expect(sm.size).to.eql(0)
      expect([...sm.keys()]).to.eql([])
    })

    it('default order', async () => {
      const sm = new SortedMap<number, string>()

      sm.set(1, 'a')
      sm.set(3, 'c')
      sm.set(2, 'b')

      expect(sm.size).to.eql(3)
      expect([...sm.keys()]).to.eql([1, 2, 3])
      expect([...sm.values()]).to.eql(['a', 'b', 'c'])
      expect([...sm.entries()]).to.eql([[1, 'a'], [2, 'b'], [3, 'c']])
      expect([...sm]).to.eql([...sm.entries()])

      const collected: Array<[number, string]> = []
      sm.forEach(i => { collected.push(i) })
      expect(collected).to.eql([...sm])
    })

    describe('custom order', () => {
      const prioritySort = (a: [string, { k?: string, priority: number }], b: [string, { k?: string, priority: number }]): number => b[1].priority - a[1].priority

      it('forward', () => {
        const sm = new SortedMap([
          ['low', { priority: 1 }],
          ['high', { priority: 2 }]
        ], prioritySort)
        expect([...sm.keys()]).to.eql(['high', 'low'])
      })

      it('backward', () => {
        const sm = new SortedMap([
          ['high', { priority: 2 }],
          ['low', { priority: 1 }]
        ], prioritySort)
        expect([...sm.keys()]).to.eql(['high', 'low'])
      })

      it('insert start', () => {
        const sm = new SortedMap([
          ['mid', { priority: 2 }],
          ['low', { priority: 1 }],
          ['high', { priority: 3 }]
        ], prioritySort)
        expect([...sm.keys()]).to.eql(['high', 'mid', 'low'])
      })

      it('insert end', () => {
        const sm = new SortedMap([
          ['low', { priority: 1 }],
          ['mid', { priority: 2 }],
          ['high', { priority: 3 }]
        ], prioritySort)
        expect([...sm.keys()]).to.eql(['high', 'mid', 'low'])
      })

      it('insert middle', () => {
        const sm = new SortedMap([
          ['low', { priority: 1 }],
          ['high', { priority: 3 }],
          ['mid', { priority: 2 }]
        ], prioritySort)
        expect([...sm.keys()]).to.eql(['high', 'mid', 'low'])
      })

      it('insert same priority start', () => {
        const sm = new SortedMap([
          ['low', { priority: 1 }],
          ['high-a', { priority: 3 }],
          ['high-b', { priority: 3 }]
        ], prioritySort)
        expect([...sm.keys()].map(s => s.substring(0, 4))).to.eql(['high', 'high', 'low'])
      })

      it('insert same priority end', () => {
        const sm = new SortedMap([
          ['hi', { priority: 3 }],
          ['low-a', { priority: 1 }],
          ['low-b', { priority: 1 }]
        ], prioritySort)
        expect([...sm.keys()].map(s => s.substring(0, 3))).to.eql(['hi', 'low', 'low'])
      })

      it('insert same key', () => {
        const sm = new SortedMap([
          ['low', { priority: 1 }],
          ['high', { priority: 3 }],
          ['high', { priority: 4 }]
        ], prioritySort)
        expect([...sm.keys()]).to.eql(['high', 'low'])
      })

      it('update', () => {
        const sm = new SortedMap([], prioritySort)

        const data1 = { k: 'v1', priority: 1 }
        const data2 = { k: 'v2', priority: 3 }
        const data3 = { k: 'v3', priority: 2 }
        sm.set('one', data1)
        sm.set('two', data2)
        sm.set('three', data3)

        expect([...sm.keys()]).to.eql(['two', 'three', 'one'])
        expect([...sm.values()].map(v => v.k)).to.eql(['v2', 'v3', 'v1'])

        // After changing data that affects the sort order, need to call update
        // to actually trigger the sort
        data3.priority = 5
        sm.update(1) // 'three'

        expect([...sm.keys()]).to.eql(['three', 'two', 'one'])
        expect([...sm.values()].map(v => v.k)).to.eql(['v3', 'v2', 'v1'])
      })

      it('delete same priority', () => {
        const sm = new SortedMap([
          ['a', { priority: 1 }],
          ['b', { priority: 1 }],
          ['c', { priority: 1 }]
        ], prioritySort)

        sm.delete('a')

        expect([...sm.keys()].sort()).to.eql(['b', 'c'])
      })
    })
  })
})

describe('varint encoder', () => {
  it('should encode and decode', () => {
    const input = [1, 112, 18]
    const encoded = varintEncoder(input)
    const decoded = varintDecoder(encoded)

    expect(decoded).to.deep.equal(input)
  })
})
