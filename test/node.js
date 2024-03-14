/* eslint-env mocha */
import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
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

  it('has css file with expected content', async () => {
    await expect(access(resolve(cwd, '../dist/ipfs-sw-styles.css'), constants.F_OK)).to.not.be.rejected()
    const contents = await readFile(resolve(cwd, '../dist/ipfs-sw-styles.css'), 'utf8')
    expect(contents).to.include('47vh')
    expect(contents).to.include('.local-storage-toggle input.status')
  })
})
