/* eslint-disable no-console */

import * as fs from 'node:fs/promises'
import { car } from '@helia/car'
import { dagCbor } from '@helia/dag-cbor'
import { dagJson } from '@helia/dag-json'
import { json } from '@helia/json'
import { unixfs } from '@helia/unixfs'
import * as cborg from 'cborg'
import { createHelia } from 'helia'
import { fixedSize } from 'ipfs-unixfs-importer/chunker'
import { CID } from 'multiformats'
import type { Car } from '@helia/car'
import type { DAGCBOR } from '@helia/dag-cbor'
import type { DAGJSON } from '@helia/dag-json'
import type { JSON } from '@helia/json'
import type { UnixFS } from '@helia/unixfs'
import type { Helia } from 'helia'

const __dirname = import.meta.dirname

interface Context {
  helia: Helia
  car: Car
  unixfs: UnixFS
  json: JSON
  dagJson: DAGJSON
  dagCbor: DAGCBOR
}

/**
 * Generate DAG-CBOR DAG that can be traversed depth-first or breadth-first
 */
async function generateTraversalCar ({ car, dagCbor }: Context): Promise<void> {
  const node3 = {
    name: 'node3'
  }
  const node3Cid = await dagCbor.add(node3)

  const node2 = {
    name: 'node2'
  }
  const node2Cid = await dagCbor.add(node2)

  const node1 = {
    name: 'node1',
    node2: node2Cid
  }
  const node1Cid = await dagCbor.add(node1)

  const node0 = {
    name: 'node0',
    node1: node1Cid,
    node3: node3Cid
  }
  const node0Cid = await dagCbor.add(node0)

  console.info('Deep CBOR DAG', `${node0Cid}.car`)
  await fs.writeFile(`${__dirname}/${node0Cid}.car`, car.export(node0Cid))
}

/**
 * Generate DAG-CBOR DAG with duplicate blocks
 */
async function generateCarWithDuplicates ({ car, dagCbor }: Context): Promise<void> {
  const node1 = {
    name: 'node1'
  }
  const node1Cid = await dagCbor.add(node1)

  const node0 = {
    name: 'node0',
    node1: node1Cid,
    node2: node1Cid
  }
  const node0Cid = await dagCbor.add(node0)

  console.info('CBOR DAG with duplicates', `${node0Cid}.car`)
  await fs.writeFile(`${__dirname}/${node0Cid}.car`, car.export(node0Cid))
}

/**
 * Generate UnixFS directory with a small file
 */
async function generateDirectoryWithFile ({ car, unixfs }: Context): Promise<void> {
  const file = await unixfs.addBytes(Uint8Array.from([0, 1, 2, 3]))
  const emptyDir = await unixfs.addDirectory()
  const dir = await unixfs.cp(file, emptyDir, 'foo.txt')

  console.info('Directory with file', `${dir}.car`)
  await fs.writeFile(`${__dirname}/${dir}.car`, car.export(dir))
}

/**
 * Generate UnixFS file that has multiple blocks
 */
async function generateMultiBlockFile ({ car, unixfs }: Context): Promise<void> {
  const file = await unixfs.addBytes(Uint8Array.from([0, 1, 2, 3, 4, 5]), {
    chunker: fixedSize({
      chunkSize: 2
    })
  })

  console.info('Multi-block file', `${file}.car`)
  await fs.writeFile(`${__dirname}/${file}.car`, car.export(file))
}

async function generateDAGJSON ({ car, dagJson }: Context): Promise<void> {
  const obj = {
    hello: {
      '/': 'bafkqaddimvwgy3zao5xxe3debi'
    }
  }
  const cid = await dagJson.add(obj)

  console.info('JSON file', `${cid}.car`)
  await fs.writeFile(`${__dirname}/${cid}.car`, car.export(cid))
}

async function generateDAGCBOR ({ car, dagCbor }: Context): Promise<void> {
  const obj = {
    hello: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
  }
  const cid = await dagCbor.add(obj)

  console.info('DAG-CBOR file', `${cid}.car`)
  await fs.writeFile(`${__dirname}/${cid}.car`, car.export(cid))
}

async function generateCBOR ({ car, dagCbor }: Context): Promise<void> {
  const obj = {
    hello: 'world'
  }
  let cid = await dagCbor.add(obj)
  cid = CID.createV1(0x51, cid.multihash)

  console.info('CBOR file', `${cid}.car`)
  await fs.writeFile(`${__dirname}/${cid}.car`, car.export(cid))
}

/**
 * Smallest byte sequences each content-type sniffer recognises.
 * `test-e2e/media-viewer.test.ts` uses these to exercise the media-viewer
 * wrapper (#574) without runtime network IO.
 *
 * - PNG: 67-byte 1x1 fully transparent image, the canonical minimum.
 * - MP4: a single `ftyp mp42` box; file-type sniffs the magic at offset 4.
 * - PDF: `%PDF-` magic plus a trivial trailer; file-type sniffs the prefix.
 * - TXT / JSON: file-type leaves text formats alone, so verified-fetch
 * reads the content-type from the wrapping directory's filename
 * extension.
 */
async function generateMediaViewerFixtures ({ car, unixfs }: Context): Promise<void> {
  const fixtures: Array<{ name: string, content: Uint8Array, label: string }> = [
    {
      name: 'pixel.png',
      label: '1x1 PNG',
      content: new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x60, 0x01, 0x00, 0x00,
        0x00, 0x05, 0x00, 0x01, 0xAA, 0xEE, 0xC4, 0x22, 0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ])
    },
    {
      name: 'tiny.mp4',
      label: 'minimal MP4 (ftyp box only)',
      content: new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32,
        0x00, 0x00, 0x00, 0x00, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D
      ])
    },
    {
      name: 'tiny.pdf',
      label: 'minimal PDF',
      content: new TextEncoder().encode('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
    },
    {
      name: 'readme.txt',
      label: 'plain text',
      content: new TextEncoder().encode('hello from a text file\n')
    },
    {
      name: 'data.json',
      label: 'plain JSON',
      content: new TextEncoder().encode('{"hello":"world"}\n')
    }
  ]

  for (const { name, content, label } of fixtures) {
    // dag-pb encoding (`rawLeaves: false`) is the canonical form for the
    // active media-viewer tests: `plugin-handle-unixfs` sniffs the bytes,
    // so `/ipfs/<dir>/<name>` and `/ipfs/<file>` both serve the file with
    // the right content-type.
    const dagPbFile = await unixfs.addBytes(content, { rawLeaves: false })
    const emptyDir = await unixfs.addDirectory()
    const dir = await unixfs.cp(dagPbFile, emptyDir, name)
    console.info(`Media viewer fixture (dag-pb): ${label} dir=${dir} file=${dagPbFile} path=/ipfs/${dir}/${name}`)
    await fs.writeFile(`${__dirname}/${dir}.car`, car.export(dir))

    // raw-codec single-block encoding (`rawLeaves: true`, the unixfs
    // default for content that fits in one block) is what Kubo and most
    // modern IPFS tooling emit. `plugin-handle-raw` serves these CIDs
    // with `Content-Type: application/vnd.ipld.raw` today instead of
    // sniffing the bytes (verified-fetch bug; see the TODO block in
    // `test-e2e/media-viewer.test.ts`). Export the CAR anyway so the
    // commented-out tests run as soon as upstream lands a fix.
    const rawFile = await unixfs.addBytes(content)
    console.info(`Media viewer fixture (raw): ${label} file=${rawFile}`)
    await fs.writeFile(`${__dirname}/${rawFile}.car`, car.export(rawFile))
  }
}

const helia = await createHelia({
  codecs: [{
    name: 'cbor',
    code: 0x51,
    encode: (obj) => cborg.encode(obj),
    decode: (buf) => cborg.decode(new Uint8Array(buf))
  }]
}).start()

const context = {
  helia,
  car: car(helia),
  unixfs: unixfs(helia),
  json: json(helia),
  dagJson: dagJson(helia),
  dagCbor: dagCbor(helia)
}

try {
  await generateTraversalCar(context)
  await generateCarWithDuplicates(context)
  await generateDirectoryWithFile(context)
  await generateMultiBlockFile(context)
  await generateDAGJSON(context)
  await generateDAGCBOR(context)
  await generateCBOR(context)
  await generateMediaViewerFixtures(context)
} finally {
  await helia.stop()
}
