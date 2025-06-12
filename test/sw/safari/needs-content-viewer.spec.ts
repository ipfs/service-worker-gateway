import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { needsContentViewer } from '../../../src/sw/safari/needs-content-viewer.js'

function mockResponse (headers: Record<string, string | null> = {}): Response {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null
    }
  } as Response
}

function mockEvent ({
  mode = 'navigate',
  destination = 'document',
  headers = {}
}: {
  mode?: string
  destination?: string
  headers?: Record<string, string | null>
}): FetchEvent {
  return {
    request: {
      mode,
      destination,
      headers: {
        get: (key: string) => headers[key.toLowerCase()] ?? null
      }
    }
  } as unknown as FetchEvent
}

describe('needsContentViewer', () => {
  it('returns false if not a top-level navigation', () => {
    const event = mockEvent({ mode: 'no-cors', destination: 'image' })
    const response = mockResponse()
    expect(needsContentViewer({ response, event, acceptMatchesContentType: sinon.fake.returns(false) })).to.be.false()
  })

  it('returns false if user-agent is not Safari', () => {
    const event = mockEvent({
      headers: { 'user-agent': 'Mozilla/5.0 Chrome/112 Safari/537.36' }
    })
    const response = mockResponse()
    expect(needsContentViewer({ response, event, acceptMatchesContentType: sinon.fake.returns(false) })).to.be.false()
  })

  it('returns false if content-disposition forces download', () => {
    const event = mockEvent({
      headers: { 'user-agent': 'Safari/605.1.15' }
    })
    const response = mockResponse({ 'content-disposition': 'attachment; filename="file.jpg"' })
    expect(needsContentViewer({ response, event, acceptMatchesContentType: sinon.fake.returns(false) })).to.be.false()
  })

  it('returns false if content-type is not renderable', () => {
    const event = mockEvent({
      headers: { 'user-agent': 'Safari/605.1.15' }
    })
    const response = mockResponse({ 'content-type': 'application/json' })
    expect(needsContentViewer({ response, event, acceptMatchesContentType: sinon.fake.returns(false) })).to.be.false()
  })

  it('returns false if accept header matches content type', () => {
    const event = mockEvent({
      headers: {
        'user-agent': 'Safari/605.1.15',
        accept: 'image/jpeg'
      }
    })
    const response = mockResponse({ 'content-type': 'image/jpeg' })
    expect(needsContentViewer({ response, event, acceptMatchesContentType: sinon.fake.returns(true) })).to.be.false()
  })

  it('returns true when all conditions are met', () => {
    const event = mockEvent({
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/15.0 Safari/605.1.15',
        accept: 'text/html'
      }
    })
    const response = mockResponse({ 'content-type': 'image/jpeg' })
    expect(needsContentViewer({ response, event, acceptMatchesContentType: sinon.fake.returns(false) })).to.be.true()
  })

  it('returns true if user-agent is null but all other conditions match', () => {
    const event = mockEvent({
      headers: { accept: 'text/html' }
    })
    const response = mockResponse({ 'content-type': 'video/mp4' })
    expect(needsContentViewer({ response, event, acceptMatchesContentType: sinon.fake.returns(false) })).to.be.true()
  })
})
