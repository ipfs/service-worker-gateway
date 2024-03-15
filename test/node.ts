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

})
