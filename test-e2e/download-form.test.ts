import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { CarReader } from '@ipld/car'
import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import * as cbor from 'cborg'
import { unmarshalIPNSRecord } from 'ipns'
import all from 'it-all'
import toBuffer from 'it-to-buffer'
import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import * as tar from 'tar'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { setConfig } from './fixtures/set-sw-config.ts'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.ts'
import type { Download, Page, Response } from 'playwright'

function captureDownloadResponse (page: Page, cid: string): Promise<Response> {
  const responsePromise = Promise.withResolvers<Response>()

  page.on('response', (response) => {
    const url = new URL(response.url())

    if (url.host !== `${cid}.ipfs.localhost:3333`) {
      return
    }

    if (!url.searchParams.has('download')) {
      return
    }

    responsePromise.resolve(response)
  })

  return responsePromise.promise
}

test.describe('download form', () => {
  let download: Download

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3333')
    await setConfig(page)
    await waitForServiceWorker(page)
  })

  test.afterEach(async () => {
    try {
      await download?.delete()
    } catch {
      // this can throw if the page has already closed
    }
  })

  test('should download a block', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')

    await page.fill('#inputContent', '/ipfs/bafkqaddimvwgy3zao5xxe3debi')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.click('#load-directly')

    download = await downloadPromise

    const file = await fsp.readFile(await download.path(), {
      encoding: 'utf-8'
    })

    expect(file).toBe('hello world\n')
  })

  test('should download a block and override the file name', async ({ page }) => {
    const filename = 'custom-filename.txt'
    const downloadPromise = page.waitForEvent('download')

    await page.fill('#inputContent', '/ipfs/bafkqaddimvwgy3zao5xxe3debi')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.fill('#filename', filename)
    await page.click('#load-directly')

    download = await downloadPromise
    expect(download.suggestedFilename()).toBe(filename)

    const file = await fsp.readFile(await download.path(), {
      encoding: 'utf-8'
    })
    expect(file).toBe('hello world\n')
  })

  test('should download a block and specify raw format', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')

    await page.fill('#inputContent', '/ipfs/bafkqaddimvwgy3zao5xxe3debi')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.selectOption('#format', 'raw')
    await page.click('#load-directly')

    download = await downloadPromise
    expect(download.suggestedFilename()).toBe('bafkqaddimvwgy3zao5xxe3debi.raw')

    const file = await fsp.readFile(await download.path(), {
      encoding: 'utf-8'
    })
    expect(file).toBe('hello world\n')
  })

  test('should download a block and specify car format', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')

    await page.fill('#inputContent', '/ipfs/bafkqaddimvwgy3zao5xxe3debi')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.selectOption('#format', 'car')
    await page.click('#load-directly')

    download = await downloadPromise
    expect(download.suggestedFilename()).toBe('bafkqaddimvwgy3zao5xxe3debi.car')

    const inStream = fs.createReadStream(await download.path())
    const reader = await CarReader.fromIterable(inStream)

    expect(await reader.getRoots()).toStrictEqual([
      CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    ])
  })

  test.describe('car format options', () => {
    test('should specify car version as v1', async ({ page }) => {
      const cid = 'bafkqaddimvwgy3zao5xxe3debi'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.selectOption('#car-version', '1')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])
    })

    test('should specify car version as v2', async ({ page }) => {
      const cid = 'bafkqaddimvwgy3zao5xxe3debi'

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.selectOption('#car-version', '2')
      await page.click('#load-directly')

      // TODO: `@ipld/car` only supports CARv1
      const response = await page.waitForResponse(`http://${cid}.ipfs.localhost:3333?download=true&format=car&car-version=2`)
      expect(response.status()).toBe(406)
    })

    test('should specify DFS block traversal order', async ({ page }) => {
      const cid = 'bafyreiagfcucdlcbo333incasoqyizw7ecaj5sfb3scippojfb7dm6fjcy'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.selectOption('#block-traversal-order', 'dfs')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=dfs; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid),
        CID.parse('bafyreibzw6etelhkestwmhiqpajsfeo367352zxyhborj63itvx4wyusfm'),
        CID.parse('bafyreidtfpkab56usijqmlnlx7buro2t6xjwp5dphq5notj3opjpttnhqu'),
        CID.parse('bafyreidlvxrostw4zgxgpvy4ztljsai66i4znwwhzy3lndy6yviwdo5avq')
      ])
    })

    test('should specify unknown block traversal order', async ({ page }) => {
      const cid = 'bafyreiagfcucdlcbo333incasoqyizw7ecaj5sfb3scippojfb7dm6fjcy'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.selectOption('#block-traversal-order', 'unk')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid),
        CID.parse('bafyreibzw6etelhkestwmhiqpajsfeo367352zxyhborj63itvx4wyusfm'),
        CID.parse('bafyreidlvxrostw4zgxgpvy4ztljsai66i4znwwhzy3lndy6yviwdo5avq'),
        CID.parse('bafyreidtfpkab56usijqmlnlx7buro2t6xjwp5dphq5notj3opjpttnhqu')
      ])
    })

    test('should allow duplicate blocks', async ({ page }) => {
      const cid = 'bafyreidb33bjp5ns3cfpzcbn34hrbmt4rrndri3uv4howob3hythkyddci'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.selectOption('#allow-duplicate-blocks', 'y')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid),
        CID.parse('bafyreicwhhbbbl7p6q4ipcpqjis55ji5wqa4wllobibynjwt6mt2mum4fy'),
        CID.parse('bafyreicwhhbbbl7p6q4ipcpqjis55ji5wqa4wllobibynjwt6mt2mum4fy')
      ])
    })

    test('should disallow duplicate blocks', async ({ page }) => {
      const cid = 'bafyreidb33bjp5ns3cfpzcbn34hrbmt4rrndri3uv4howob3hythkyddci'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.selectOption('#allow-duplicate-blocks', 'n')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=n')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid),
        CID.parse('bafyreicwhhbbbl7p6q4ipcpqjis55ji5wqa4wllobibynjwt6mt2mum4fy')
      ])
    })

    test('should choose block DAG scope', async ({ page }) => {
      const cid = 'bafybeicvjyaiqmgfe7wupl72gpf7cadwyjqf7nzsxrap6npgrgtd3d6m4y'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.selectOption('#dag-scope', 'block')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid)
      ])
    })

    test('should choose entity DAG scope', async ({ page }) => {
      const cid = 'bafybeicvjyaiqmgfe7wupl72gpf7cadwyjqf7nzsxrap6npgrgtd3d6m4y'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.selectOption('#dag-scope', 'entity')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])

      // CID is for a directory so only that should be included
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid)
      ])
    })

    test('should choose all DAG scope', async ({ page }) => {
      const cid = 'bafybeicvjyaiqmgfe7wupl72gpf7cadwyjqf7nzsxrap6npgrgtd3d6m4y'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.selectOption('#dag-scope', 'all')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])

      // directory and contents should be included
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid),
        CID.parse('bafkreiafj3pmdubbd5re73imxsu5j6kabmheshcdoqvpfrnqvpv7bsmq3a')
      ])
    })

    test('should use entity-bytes to select all blocks', async ({ page }) => {
      const cid = 'bafybeia7mk3ljigvxaqlzqapyo22hivsja2n5tdjmhpqvvzheoyaribela'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.fill('#entity-bytes-from', '0')
      await page.fill('#entity-bytes-to', '*')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid),
        CID.parse('bafkreifucp2h2e7of7tmqrns5ykbv6a55bmn6twfjgsyw6lqxolgiw6i2i'),
        CID.parse('bafkreihosbapmxbudbk6a4h7iohlb2u5lobrwkrme4h3p32zfv2qichdwm'),
        CID.parse('bafkreibpugzxpp3hgcpwlzphxsozeq2fzjsi33comandtcu4wsl5zorxmu')
      ])
    })

    test('should use entity-bytes to select first block', async ({ page }) => {
      const cid = 'bafybeia7mk3ljigvxaqlzqapyo22hivsja2n5tdjmhpqvvzheoyaribela'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.fill('#entity-bytes-from', '0')
      await page.fill('#entity-bytes-to', '1')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])

      // directory and contents should be included
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid),
        CID.parse('bafkreifucp2h2e7of7tmqrns5ykbv6a55bmn6twfjgsyw6lqxolgiw6i2i')
      ])
    })

    test('should use entity-bytes to select middle block', async ({ page }) => {
      const cid = 'bafybeia7mk3ljigvxaqlzqapyo22hivsja2n5tdjmhpqvvzheoyaribela'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.fill('#entity-bytes-from', '2')
      await page.fill('#entity-bytes-to', '3')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])

      // directory and contents should be included
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid),
        CID.parse('bafkreihosbapmxbudbk6a4h7iohlb2u5lobrwkrme4h3p32zfv2qichdwm')
      ])
    })

    test('should use entity-bytes to select last block', async ({ page }) => {
      const cid = 'bafybeia7mk3ljigvxaqlzqapyo22hivsja2n5tdjmhpqvvzheoyaribela'
      const responsePromise = captureDownloadResponse(page, cid)
      const downloadPromise = page.waitForEvent('download')

      await page.fill('#inputContent', `/ipfs/${cid}`)
      await page.click('#show-advanced')
      await page.selectOption('#download', 'true')
      await page.selectOption('#format', 'car')
      await page.fill('#entity-bytes-from', '4')
      await page.fill('#entity-bytes-to', '*')
      await page.click('#load-directly')

      // verify response headers were correct
      const response = await responsePromise
      expect(await response.headerValue('content-disposition')).toBe(`attachment; filename="${cid}.car"`)
      expect(await response.headerValue('content-type')).toBe('application/vnd.ipld.car; version=1; order=unk; dups=y')

      // check downloaded file was correct
      download = await downloadPromise
      expect(download.suggestedFilename()).toBe(`${cid}.car`)

      const inStream = fs.createReadStream(await download.path())
      const reader = await CarReader.fromIterable(inStream)

      expect(await reader.getRoots()).toStrictEqual([
        CID.parse(cid)
      ])

      // directory and contents should be included
      expect(await all(reader.cids())).toStrictEqual([
        CID.parse(cid),
        CID.parse('bafkreibpugzxpp3hgcpwlzphxsozeq2fzjsi33comandtcu4wsl5zorxmu')
      ])
    })
  })

  test('should download a tar file', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')
    await page.fill('#inputContent', '/ipfs/bafkqaddimvwgy3zao5xxe3debi')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.selectOption('#format', 'tar')
    await page.click('#load-directly')

    download = await downloadPromise
    expect(download.suggestedFilename()).toBe('bafkqaddimvwgy3zao5xxe3debi.tar')

    const files: Record<string, Uint8Array> = {}

    await tar.extract({
      file: await download.path(),
      onReadEntry: async (entry) => {
        files[entry.path] = toBuffer(await entry.collect())
      }
    })

    expect(files['bafkqaddimvwgy3zao5xxe3debi']).toBeTruthy()
    expect(new TextDecoder().decode(files['bafkqaddimvwgy3zao5xxe3debi'])).toBe('hello world\n')
  })

  test('should download a block and specify DAG-JSON format', async ({ page }) => {
    const obj = {
      hello: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }

    const downloadPromise = page.waitForEvent('download')
    await page.fill('#inputContent', '/ipfs/baguqeerasfd64cjvzypw23uldj56sxclylkk264h2t76cks4vl7g5ilca3aq')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.selectOption('#format', 'dag-json')
    await page.click('#load-directly')

    download = await downloadPromise

    const file = await fsp.readFile(await download.path())
    const decoded = dagJson.decode(file)
    expect(decoded).toStrictEqual(obj)
  })

  test('should download a block and specify DAG-CBOR format', async ({ page }) => {
    const obj = {
      hello: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }

    const downloadPromise = page.waitForEvent('download')
    await page.fill('#inputContent', '/ipfs/bafyreicqloxaaoq4f5ykqits4iktnmvab62i7nqanv4uce55ep4f6omnvm')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.selectOption('#format', 'dag-cbor')
    await page.click('#load-directly')

    download = await downloadPromise

    const file = await fsp.readFile(await download.path())
    const decoded = dagCbor.decode(file)
    expect(decoded).toStrictEqual(obj)
  })

  test('should download a block and specify JSON format', async ({ page }) => {
    const obj = {
      hello: {
        '/': 'bafkqaddimvwgy3zao5xxe3debi'
      }
    }

    const downloadPromise = page.waitForEvent('download')
    await page.fill('#inputContent', '/ipfs/baguqeerasfd64cjvzypw23uldj56sxclylkk264h2t76cks4vl7g5ilca3aq')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.selectOption('#format', 'json')
    await page.click('#load-directly')

    download = await downloadPromise

    const file = await fsp.readFile(await download.path())
    const decoded = json.decode(file)
    expect(decoded).toStrictEqual(obj)
  })

  test('should download a block and specify CBOR format', async ({ page }) => {
    const obj = {
      hello: 'world'
    }

    const downloadPromise = page.waitForEvent('download')
    await page.fill('#inputContent', '/ipfs/bafireidykglsfhoixmivffc5uwhcgshx4j465xwqntbmu43nb2dzqwfvae')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.selectOption('#format', 'cbor')
    await page.click('#load-directly')

    download = await downloadPromise

    const file = await fsp.readFile(await download.path())
    const decoded = cbor.decode(file)
    expect(decoded).toStrictEqual(obj)
  })

  test('should download a block and specify IPNS Record format', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')
    await page.fill('#inputContent', '/ipns/k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.selectOption('#format', 'ipns-record')
    await page.click('#load-directly')

    download = await downloadPromise

    const file = await fsp.readFile(await download.path())
    const decoded = unmarshalIPNSRecord(file)
    expect(decoded.value).toEqual('/ipfs/bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am')
    expect(decoded.validityType).toEqual('EOL')
    expect(decoded.validity).toEqual('2123-04-12T13:44:59.801728Z')
  })
})
