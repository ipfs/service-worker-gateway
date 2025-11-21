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

const helia = await createHelia({
  codecs: [{
    name: 'cbor',
    code: 0x51,
    encode: (obj) => cborg.encode(obj),
    decode: (buf) => cborg.decode(new Uint8Array(buf))
  }]
})

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
} finally {
  await helia.stop()
}
