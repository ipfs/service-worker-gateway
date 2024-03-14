/* eslint-env mocha */
import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'aegir/chai'

const cwd = dirname(fileURLToPath(import.meta.url))

const distRoot = resolve(cwd, '../../dist')

describe(`verify-dist at ${distRoot}`, () => {
  const distTests = [
    {
      file: 'ipfs-sw-sw.js'
    },
    {
      file: 'ipfs-sw-styles.css',
      content: ['47vh', '.local-storage-toggle']
    }
  ]

  distTests.forEach(({ file, content }) => {
    it(`has ${file} with expected content`, async () => {
      const filePath = resolve(distRoot, file)
      await expect(access(filePath, constants.F_OK)).to.not.be.rejected()
      if (content != null) {
        const fileContents = await readFile(filePath, 'utf8')
        content.forEach((c) => {
          expect(fileContents).to.include(c)
        })
      }
    })
  })

  // it('has a service worker with the correct name', async () => {
  // /**
  //  * test to confirm that the service worker generated in /dist does not change names
  //  */
  //   await expect(access(resolve(distRoot, 'ipfs-sw-sw.js'), constants.F_OK)).to.not.be.rejected()
  // })

  // it('has css file with expected content', async () => {
  //   await expect(access(resolve(distRoot, 'ipfs-sw-styles.css'), constants.F_OK)).to.not.be.rejected()
  //   const contents = await readFile(resolve(distRoot, 'ipfs-sw-styles.css'), 'utf8')
  //   expect(contents).to.include('47vh')
  //   expect(contents).to.include('.local-storage-toggle input.status')
  // })
})
