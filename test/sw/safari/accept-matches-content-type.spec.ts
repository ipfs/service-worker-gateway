/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { acceptMatchesContentType } from '../../../src/sw/safari/accept-matches-content-type.js'

describe('acceptMatchesContentType', () => {
  it('returns false if acceptHeader is null', () => {
    expect(acceptMatchesContentType(null, 'image/jpeg')).to.be.false()
  })

  it('returns false if contentType is null', () => {
    expect(acceptMatchesContentType('image/jpeg', null)).to.be.false()
  })

  it('returns false if contentType is malformed', () => {
    expect(acceptMatchesContentType('image/jpeg', 'jpeg')).to.be.false()
    expect(acceptMatchesContentType('image/jpeg', '')).to.be.false()
  })

  it('returns true for exact match', () => {
    expect(acceptMatchesContentType('image/jpeg', 'image/jpeg')).to.be.true()
  })

  it('returns true for wildcard subtype match', () => {
    expect(acceptMatchesContentType('image/*', 'image/jpeg')).to.be.true()
  })

  it('returns false for unmatched type', () => {
    expect(acceptMatchesContentType('application/json', 'image/jpeg')).to.be.false()
  })

  it('returns false for */* wildcard', () => {
    expect(acceptMatchesContentType('*/*', 'image/jpeg')).to.be.false()
  })

  it('ignores q values and returns correct result', () => {
    expect(acceptMatchesContentType('image/jpeg;q=0.8', 'image/jpeg')).to.be.true()
    expect(acceptMatchesContentType('image/*;q=0.8', 'image/jpeg')).to.be.true()
    expect(acceptMatchesContentType('application/json;q=0.9', 'image/jpeg')).to.be.false()
  })

  it('handles multiple comma-separated types with and without q-values', () => {
    expect(acceptMatchesContentType('text/html, image/jpeg;q=0.9, */*;q=0.8', 'image/jpeg')).to.be.true()
    expect(acceptMatchesContentType('text/html, image/*;q=0.9, */*;q=0.8', 'image/jpeg')).to.be.true()
    expect(acceptMatchesContentType('text/html, application/json;q=0.9, */*;q=0.8', 'image/jpeg')).to.be.false()
  })

  it('trims whitespace properly', () => {
    expect(acceptMatchesContentType('  image/jpeg , text/html ', 'image/jpeg')).to.be.true()
  })
})
