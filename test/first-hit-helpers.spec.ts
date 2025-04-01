/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { createSandbox, type SinonSandbox } from 'sinon'
import { handleFirstHit } from '../src/lib/first-hit-helpers.js'

function expectRedirect ({ from, to, sandbox }: { from: string, to: string, sandbox: SinonSandbox }): void {
  const location = {
    href: from,
    origin: 'http://localhost:3334'
  }
  let setLocation: string = 'N/A'
  sandbox.stub(location, 'href').set((value: string) => {
    setLocation = value
  })
  sandbox.stub(location, 'href').get(() => {
    return from
  })
  const history = {
    replaceState: () => {}
  }

  handleFirstHit({ location, history })
  expect(setLocation).to.equal(to)
}

describe('first-hit-helpers', () => {
  describe('handleFirstHit', () => {
    const sandbox = createSandbox()
    afterEach(() => {
      sandbox.restore()
    })
    it('should bounce to ?helia-sw=<path> url', () => {
      expectRedirect({
        from: 'http://localhost:3334/ipfs/bafkqablimvwgy3y',
        to: `http://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y')}`,
        sandbox
      })
    })
  })
})
