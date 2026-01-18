import { expect } from 'aegir/chai'
import { parseHashFragments, getHashFragment, setHashFragment, deleteHashFragment, hasHashFragment, hashFragmentsToString } from '../src/lib/hash-fragments.js'

describe('hash-fragments', () => {
  describe('hashFragmentsToString', () => {
    it('should round-trip empty hash', () => {
      const hash = ''
      const fragments = parseHashFragments(hash)
      const hash2 = hashFragmentsToString(fragments)
      expect(hash2).to.equal(hash)
    })
    it('should round-trip complex hash', () => {
      const hash = '#someKey=undefinedValue&someOtherKey=someValue&someNullKey&someNumericValue=123'
      const fragments = parseHashFragments(hash)
      const hash2 = hashFragmentsToString(fragments)
      expect(hash2).to.equal(hash)
    })
  })

  describe('parseHashFragments', () => {
    it('should parse empty hash', () => {
      const result = parseHashFragments('')
      expect(result).to.deep.equal({})
    })

    it('should parse hash with single fragment', () => {
      const result = parseHashFragments('#key=value')
      expect(result).to.deep.equal({ key: 'value' })
    })

    it('should parse hash with multiple fragments', () => {
      const result = parseHashFragments('#key1=value1&key2=value2')
      expect(result).to.deep.equal({ key1: 'value1', key2: 'value2' })
    })

    it('should handle URL encoding', () => {
      const result = parseHashFragments('#key%20with%20spaces=value%20with%20spaces')
      expect(result).to.deep.equal({ 'key with spaces': 'value with spaces' })
    })

    it('should handle hash without leading #', () => {
      const result = parseHashFragments('key=value')
      expect(result).to.deep.equal({ key: 'value' })
    })

    it('should keep fragments with no value', () => {
      const result = parseHashFragments('#key1=value1&malformed&key2=value2')
      expect(result).to.deep.equal({ key1: 'value1', key2: 'value2', malformed: null })
    })
  })

  describe('getHashFragment', () => {
    it('should get existing fragment', () => {
      const url = new URL('https://example.com/#key=value')
      const result = getHashFragment(url, 'key')
      expect(result).to.equal('value')
    })

    it('should return null for non-existent fragment', () => {
      const url = new URL('https://example.com/#key=value')
      const result = getHashFragment(url, 'nonexistent')
      expect(result).to.be.null()
    })

    it('should return null for empty hash', () => {
      const url = new URL('https://example.com/')
      const result = getHashFragment(url, 'key')
      expect(result).to.be.null()
    })
  })

  describe('setHashFragment', () => {
    it('should set fragment on empty hash', () => {
      const url = new URL('https://example.com/')
      setHashFragment(url, 'key', 'value')
      expect(url.hash).to.equal('#key=value')
    })

    it('should set fragment on existing hash', () => {
      const url = new URL('https://example.com/#existing=value')
      setHashFragment(url, 'key', 'value')
      expect(url.hash).to.equal('#existing=value&key=value')
    })

    it('should update existing fragment', () => {
      const url = new URL('https://example.com/#key=oldvalue')
      setHashFragment(url, 'key', 'newvalue')
      expect(url.hash).to.equal('#key=newvalue')
    })

    it('should handle URL encoding', () => {
      const url = new URL('https://example.com/')
      setHashFragment(url, 'key with spaces', 'value with spaces')
      expect(url.hash).to.equal('#key%20with%20spaces=value%20with%20spaces')
    })
  })

  describe('deleteHashFragment', () => {
    it('should delete existing fragment', () => {
      const url = new URL('https://example.com/#key1=value1&key2=value2')
      deleteHashFragment(url, 'key1')
      expect(url.hash).to.equal('#key2=value2')
    })

    it('should handle deleting last fragment', () => {
      const url = new URL('https://example.com/#key=value')
      deleteHashFragment(url, 'key')
      expect(url.hash).to.equal('')
    })

    it('should handle deleting non-existent fragment', () => {
      const url = new URL('https://example.com/#key=value')
      deleteHashFragment(url, 'nonexistent')
      expect(url.hash).to.equal('#key=value')
    })

    it('should handle empty hash', () => {
      const url = new URL('https://example.com/')
      deleteHashFragment(url, 'key')
      expect(url.hash).to.equal('')
    })
  })

  describe('hasHashFragment', () => {
    it('should return true for existing fragment', () => {
      const url = new URL('https://example.com/#key=value')
      const result = hasHashFragment(url, 'key')
      expect(result).to.be.true()
    })

    it('should return false for non-existent fragment', () => {
      const url = new URL('https://example.com/#key=value')
      const result = hasHashFragment(url, 'nonexistent')
      expect(result).to.be.false()
    })

    it('should return false for empty hash', () => {
      const url = new URL('https://example.com/')
      const result = hasHashFragment(url, 'key')
      expect(result).to.be.false()
    })
  })

  describe('integration tests', () => {
    it('should handle multiple operations on same URL', () => {
      const url = new URL('https://example.com/')

      // Set multiple fragments
      setHashFragment(url, 'key1', 'value1')
      setHashFragment(url, 'key2', 'value2')
      expect(url.hash).to.equal('#key1=value1&key2=value2')

      // Check fragments exist
      expect(hasHashFragment(url, 'key1')).to.be.true()
      expect(hasHashFragment(url, 'key2')).to.be.true()
      expect(getHashFragment(url, 'key1')).to.equal('value1')
      expect(getHashFragment(url, 'key2')).to.equal('value2')

      // Update one fragment
      setHashFragment(url, 'key1', 'newvalue1')
      expect(getHashFragment(url, 'key1')).to.equal('newvalue1')

      // Delete one fragment
      deleteHashFragment(url, 'key1')
      expect(hasHashFragment(url, 'key1')).to.be.false()
      expect(hasHashFragment(url, 'key2')).to.be.true()
      expect(url.hash).to.equal('#key2=value2')
    })
  })
})
