import { expect } from 'aegir/chai'
import { canUseStaleResponseOnError, needsRevalidateAfterUse, needsRevalidateBeforeUse } from '../../../src/sw/lib/cache-control.ts'

describe('cache-control', () => {
  describe('needs-revalidate-before-use', () => {
    it('should not revalidate immutable response within ttl', () => {
      const res = new Response('', {
        headers: {
          date: new Date().toUTCString(),
          'cache-control': 'public, max-age=29030400, immutable'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.false()
    })

    it('should revalidate non-cacheable response', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now()).toUTCString(),
          'cache-control': 'public, no-cache'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
    })

    it('should revalidate non-storable response', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now()).toUTCString(),
          'cache-control': 'public, no-store'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
    })

    it('should revalidate stale response that must be revalidated', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, must-revalidate'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
    })

    it('should not revalidate fresh response that must be revalidated', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now()).toUTCString(),
          'cache-control': 'public, max-age=29030400, must-revalidate'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.false()
    })

    it('should not throw when cache-control has no max-age directive', () => {
      const res = new Response('', {
        headers: {
          date: new Date().toUTCString(),
          'cache-control': 'public'
        }
      })

      // falls back to the default TTL rather than throwing on a missing max-age
      expect(() => needsRevalidateBeforeUse(res)).to.not.throw()
      expect(needsRevalidateBeforeUse(res)).to.be.false()
    })

    it('should revalidate immutable response outside ttl', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, immutable'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
    })

    it('should revalidate response if age outside ttl', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          age: '50',
          'cache-control': 'public, max-age=30'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
    })

    it('should not revalidate response within max-age that carries a large Age header', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 5_000).toUTCString(),
          age: '60',
          // current age is Age + (now - date) = 60 + 5 = 65s, below max-age
          'cache-control': 'public, max-age=100'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.false()
    })

    it('should not revalidate response outside ttl but inside stale-while-revalidate', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-while-revalidate=30'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.false()
    })

    it('should revalidate response outside ttl but inside non-integer stale-while-revalidate', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-while-revalidate=30.1'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
    })

    it('should revalidate response outside ttl but stale-while-revalidate is invalid', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-while-revalidate=abc'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
    })

    it('should revalidate response outside ttl but stale-while-revalidate is negative', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-while-revalidate=-30'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
    })
  })

  describe('needs-revalidate-after-use', () => {
    it('should not need revalidation after use when response is fresh', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=500, immutable'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.false()
      expect(needsRevalidateAfterUse(res)).to.be.false()
    })

    it('should not need revalidation after use when response is stale', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=1, immutable'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
      expect(needsRevalidateAfterUse(res)).to.be.false()
    })

    it('should revalidate used response outside ttl but inside stale-while-revalidate', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-while-revalidate=30'
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.false()
      expect(needsRevalidateAfterUse(res)).to.be.true()
    })

    it('should not revalidate stale response if age outside ttl', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          age: '50',
          'cache-control': 'public, max-age=10, stale-while-revalidate=30'
        }
      })

      expect(needsRevalidateAfterUse(res)).to.be.false()
    })

    it('should not revalidate used response if stale-while-revalidate not an integer', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-while-revalidate=30.1'
        }
      })

      expect(needsRevalidateAfterUse(res)).to.be.false()
    })

    it('should not revalidate used response if stale-while-revalidate not a number', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-while-revalidate=abc'
        }
      })

      expect(needsRevalidateAfterUse(res)).to.be.false()
    })

    it('should not revalidate used response if stale-while-revalidate not a positive number', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-while-revalidate=-10'
        }
      })

      expect(needsRevalidateAfterUse(res)).to.be.false()
    })
  })

  describe('expires-header', () => {
    it('should treat a response past its Expires as stale', () => {
      const res = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          // expired 10s ago
          expires: new Date(Date.now() - 10_000).toUTCString()
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.true()
    })

    it('should treat a response within its Expires as fresh', () => {
      const res = new Response('', {
        headers: {
          date: new Date().toUTCString(),
          // expires in 10 minutes
          expires: new Date(Date.now() + 600_000).toUTCString()
        }
      })

      expect(needsRevalidateBeforeUse(res)).to.be.false()
    })
  })

  describe('can-use-stale-on-response-error', () => {
    it('should re-use stale response if within stale-if-error ttl', () => {
      const res = new Response('', {
        status: 500
      })
      const cached = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-if-error=30'
        }
      })

      expect(canUseStaleResponseOnError(res, cached)).to.be.true()
    })

    it('should not re-use stale response if outside stale-if-error ttl', () => {
      const res = new Response('', {
        status: 500
      })
      const cached = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=1, stale-if-error=1'
        }
      })

      expect(canUseStaleResponseOnError(res, cached)).to.be.false()
    })

    it('should not re-use stale response if stale-if-error not specified', () => {
      const res = new Response('', {
        status: 500
      })
      const cached = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10'
        }
      })

      expect(canUseStaleResponseOnError(res, cached)).to.be.false()
    })

    it('should not re-use stale response if age outside ttl', () => {
      const res = new Response('', {
        status: 500
      })
      const cached = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          age: '50',
          'cache-control': 'public, max-age=10, stale-if-error=30'
        }
      })

      expect(canUseStaleResponseOnError(res, cached)).to.be.false()
    })

    it('should not re-use stale response if stale-if-error not an integer', () => {
      const res = new Response('', {
        status: 500
      })
      const cached = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-if-error=30.1'
        }
      })

      expect(canUseStaleResponseOnError(res, cached)).to.be.false()
    })

    it('should not re-use stale response if stale-if-error not a number', () => {
      const res = new Response('', {
        status: 500
      })
      const cached = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-if-error=abc'
        }
      })

      expect(canUseStaleResponseOnError(res, cached)).to.be.false()
    })

    it('should not re-use stale response if stale-if-error not a positive number', () => {
      const res = new Response('', {
        status: 500
      })
      const cached = new Response('', {
        headers: {
          date: new Date(Date.now() - 20_000).toUTCString(),
          'cache-control': 'public, max-age=10, stale-if-error=-10'
        }
      })

      expect(canUseStaleResponseOnError(res, cached)).to.be.false()
    })
  })
})
