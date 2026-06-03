import { expect } from 'aegir/chai'
import { parseHeaderDirectives } from '../../../src/sw/lib/header-directives.ts'

describe('header-directives', () => {
  it('should parse header directives', () => {
    expect(parseHeaderDirectives('public, max-age=29030400, immutable')).to.deep.equal({
      public: true,
      'max-age': '29030400',
      immutable: true
    })
  })

  it('should parse empty header', () => {
    expect(parseHeaderDirectives(null)).to.deep.equal({})
  })

  it('should lowercase directive names', () => {
    expect(parseHeaderDirectives('Public, Max-Age=600, IMMUTABLE')).to.deep.equal({
      public: true,
      'max-age': '600',
      immutable: true
    })
  })
})
