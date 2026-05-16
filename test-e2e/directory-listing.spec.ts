import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as dagPb from '@ipld/dag-pb'
import { UnixFS } from 'ipfs-unixfs'
import all from 'it-all'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
import { mediaViewerFrame } from './fixtures/media-viewer.ts'
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

    await page.click(`#row-${file.cid.toV1()}-0 .name-cell`)

    // The media-viewer wrapper (#574) embeds the .txt content in an
    // iframe, so the body text lives inside the wrapper's iframe.
    await expect(mediaViewerFrame(page).getByText('hello world')).toBeVisible()
    expect(page.url().endsWith('/hello-world.txt')).toBeTruthy()
  })

  test('should download directory entry block', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    const downloadPromise = page.waitForEvent('download')
    await page.click(`#row-${file.cid.toV1()}-0 .download-block-button`)
    const download = await downloadPromise

    const downloadPath = path.join(os.tmpdir(), download.suggestedFilename())
    await download.saveAs(downloadPath)

    expect(uint8ArrayEquals(fs.readFileSync(downloadPath), await kubo.block.get(file.cid))).toBeTruthy()
  })

  test('should preview directory entry block', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    await page.click(`#row-${file.cid.toV1()}-0 .view-block-button`)

    await expect(page.getByText('Raw Preview')).toBeVisible()
  })

  test('should navigate to sub directory', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    await page.click(`#row-${subDir.cid.toV1()}-1`)
    await expect(page.getByText(path.basename(subDirFile.path))).toBeVisible()
  })

  test('should navigate back to parent directory', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)
    expect(response.status()).toBe(200)

    await page.click(`#row-${subDir.cid.toV1()}-1`)
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

  test('should follow link for file with special characters in the name', async ({ page, baseURL }) => {
    const fileName = 'h#e£l%l?o@-:w~o`rld.txt'

    ;[file, directory] = await all(kubo.addAll([{
      path: `/${fileName}`,
      content: uint8ArrayFromString('hello world\n')
    }], {
      wrapWithDirectory: true,
      rawLeaves: true
    }))

    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${directory.cid}`)
    expect(response.status()).toBe(200)

    await expect(page.locator(`#row-${file.cid.toV1()}-0 .name-cell`)).toContainText(fileName)
    await page.click(`#row-${file.cid.toV1()}-0 .name-cell`)

    await expect(mediaViewerFrame(page).getByText('hello world')).toBeVisible()
    await expect(page.locator('.display-name')).toContainText(fileName)
  })

  test('should download block for file with special characters in the name', async ({ page, baseURL }) => {
    const fileName = 'h#e£l%l?o@-:w~o`rld.txt'

    ;[file, directory] = await all(kubo.addAll([{
      path: `/${fileName}`,
      content: uint8ArrayFromString('hello world\n')
    }], {
      wrapWithDirectory: true,
      rawLeaves: true
    }))

    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${directory.cid}`)
    expect(response.status()).toBe(200)

    const downloadPromise = page.waitForEvent('download')
    await page.click(`#row-${file.cid.toV1()}-0 .download-block-button`)
    const download = await downloadPromise

    const downloadPath = path.join(os.tmpdir(), download.suggestedFilename())
    await download.saveAs(downloadPath)

    expect(uint8ArrayEquals(fs.readFileSync(downloadPath), await kubo.block.get(file.cid))).toBeTruthy()
  })

  test('should preview block for file with special characters in the name', async ({ page, baseURL }) => {
    const fileName = 'h#e£l%l?o@-:w~o`rld.txt'

    ;[file, directory] = await all(kubo.addAll([{
      path: `/${fileName}`,
      content: uint8ArrayFromString('hello world\n')
    }], {
      wrapWithDirectory: true,
      rawLeaves: true
    }))

    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${directory.cid}`)
    expect(response.status()).toBe(200)

    await page.click(`#row-${file.cid.toV1()}-0 .view-block-button`)

    await expect(page.getByText('Raw Preview')).toBeVisible()
  })

  test('should list the contents of a HAMT sharded directory', async ({ page, baseURL }) => {
    const files = new Array(2_000).fill(0).map((_, index) => ({
      path: `/${new Array(100).fill('a').join('')}-${index}.txt`,
      content: uint8ArrayFromString('hello world\n')
    }))

    const results = await all(kubo.addAll(files, {
      wrapWithDirectory: true,
      rawLeaves: true
    }))

    const directory = results[results.length - 1]

    const block = await kubo.block.get(directory.cid)
    const dag = dagPb.decode(block)
    const unixfs = UnixFS.unmarshal(dag.Data!)

    // ensure is shard
    expect(unixfs.type).toBe('hamt-sharded-directory')

    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${directory.cid}`)
    expect(response.status()).toBe(200)

    // should contain translat --ed filename
    await expect(page.locator('#row-bafkreifjjcie6lypi6ny7amxnfftagclbuxndqonfipmb64f2km2devei4-0 .name-cell')).toContainText('aaaaaaaaaaaaaaaa')

    // should not contain sharded filename
    await expect(page.locator('#row-bafkreifjjcie6lypi6ny7amxnfftagclbuxndqonfipmb64f2km2devei4-0 .name-cell')).not.toContainText('01aaaaaaaaaaaaaaaa')
  })
})
