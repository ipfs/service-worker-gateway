import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import all from 'it-all'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
import { publishDNSLink } from './fixtures/serve/dns-record-cache.ts'
import type { AddResult, KuboRPCClient } from 'kubo-rpc-client'

test.describe('directory-listing', () => {
  let kubo: KuboRPCClient
  let subDirFile: AddResult
  let subDir: AddResult
  let file: AddResult
  let directory: AddResult
  let domain = 'example.ipfs.tech'

  test.beforeEach(async () => {
    if (process.env.KUBO_GATEWAY == null || process.env.KUBO_GATEWAY === '') {
      throw new Error('KUBO_GATEWAY not set')
    }

    kubo = createKuboRPCClient(process.env.KUBO_RPC)

    ;[subDirFile, file, subDir, directory] = await all(kubo.addAll([{
      path: '/sub-dir/sub-dir-file.txt',
      content: uint8ArrayFromString('i am a subdirectory\n')
    }, {
      path: '/hello-world.txt',
      content: uint8ArrayFromString('hello world\n')
    }], {
      wrapWithDirectory: true,
      rawLeaves: true
    }))

    domain = 'example.ipfs.tech'
    await publishDNSLink(domain, directory.cid)
  })

  test('should load directory entry', async ({ page, baseURL }) => {
    test.setTimeout(640_000_000)
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    await page.click(`#row-${file.cid.toV1()} .name-cell`)

    await expect(page.getByText('hello world')).toBeVisible()
    expect(page.url().endsWith('/hello-world.txt')).toBeTruthy()
  })

  test('should download directory entry block', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    const downloadPromise = page.waitForEvent('download')
    await page.click(`#row-${file.cid.toV1()} .download-block-button`)
    const download = await downloadPromise

    const downloadPath = path.join(os.tmpdir(), download.suggestedFilename())
    await download.saveAs(downloadPath)

    expect(uint8ArrayEquals(fs.readFileSync(downloadPath), await kubo.block.get(file.cid))).toBeTruthy()
  })

  test('should preview directory entry block', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    await page.click(`#row-${file.cid.toV1()} .view-block-button`)

    await expect(page.getByText('Raw Preview')).toBeVisible()
  })

  test('should navigate to sub directory', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    await page.click(`#row-${subDir.cid.toV1()}`)
    await expect(page.getByText(path.basename(subDirFile.path))).toBeVisible()
  })

  test('should navigate back to parent directory', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    await page.click(`#row-${subDir.cid.toV1()}`)
    await expect(page.getByText(path.basename(subDirFile.path))).toBeVisible()

    await page.click('#to-parent-directory')
    await expect(page.getByText(path.basename(subDir.path))).toBeVisible()
  })

  test('should download directory block', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    const downloadPromise = page.waitForEvent('download')
    await page.click('#directory-index .download-block-button')
    const download = await downloadPromise

    const downloadPath = path.join(os.tmpdir(), download.suggestedFilename())
    await download.saveAs(downloadPath)

    expect(uint8ArrayEquals(fs.readFileSync(downloadPath), await kubo.block.get(directory.cid))).toBeTruthy()
  })

  test('should preview directory block', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    await page.click('#directory-index .view-block-button')

    await expect(page.getByText('Raw Preview')).toBeVisible()
  })
})
