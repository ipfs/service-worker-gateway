/* eslint-env mocha */
import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'aegir/chai'
import { glob } from 'glob'

const cwd = dirname(fileURLToPath(import.meta.url))

const distRoot = resolve(cwd, '../../dist')

interface DistTest {
  content?: Array<string | RegExp>
}

interface DistTestExactPath extends DistTest {
  filePath: string
  globPath?: undefined
  count?: undefined
}

/**
 * Note that globbing is only for making handling of files with chunk hashes in
 * them easier; not for running tests against multiple files.
 *
 * Only the first found file will be used, so make sure your glob is exact.
 */
interface DistTestGlobPath extends DistTest {
  filePath?: undefined
  globPath: string
}

describe(`verify-dist at ${distRoot}`, () => {
  const distTests: Array<DistTestGlobPath | DistTestExactPath> = [
    {
      filePath: 'ipfs-sw-sw.js'
    },
    {
      filePath: '_redirects',
      content: [
        '/ipfs/* /ipfs-sw-first-hit.html/ipfs/:splat 302',
        '/ipns/* /ipfs-sw-first-hit.html/ipns/:splat 302'
      ]
    },
    {
      filePath: 'index.html',
      content: [
        /ipfs-sw-index-.*\.css/,
        'id="root"'
      ]
    },
    {
      globPath: 'ipfs-sw-index-*.css',
      content: ['47vh']
    }
  ]

  distTests.forEach(({ filePath, globPath, content }) => {
    it(`has ${filePath ?? globPath} with expected content`, async () => {
      let resolvedPath
      if (filePath != null) {
        resolvedPath = resolve(distRoot, filePath)
      } else {
        const files = await glob(`${distRoot}/${globPath}`)
        resolvedPath = files[0]
      }
      await expect(access(resolvedPath, constants.F_OK)).to.not.be.rejected()
      if (content != null) {
        const fileContents = await readFile(resolvedPath, 'utf8')
        content.forEach((c) => {
          if (c instanceof RegExp) {
            expect(fileContents).to.match(c)
          } else {
            expect(fileContents).to.include(c)
          }
        })
      }
    })
  })
})
