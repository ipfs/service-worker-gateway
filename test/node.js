/* eslint-env mocha */
import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'aegir/chai'

const cwd = dirname(fileURLToPath(import.meta.url))

describe('verify-dist', async () => {
  it('has a service worker with the correct name', async () => {
  /**
   * test to confirm that the service worker generated in /dist does not change names
   */
    await expect(access(resolve(cwd, '../dist/ipfs-sw-sw.js'), constants.F_OK)).to.not.be.rejected()
  })
})
