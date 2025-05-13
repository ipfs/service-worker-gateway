/* eslint-disable no-console */
// check-ipfs-paths.ts
import { once, on } from 'node:events'
import { createReadStream } from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import PQueue from 'p-queue'

const CONCURRENCY = 10
const TIMEOUT_MS = 30_000
const INPUT_FILE = 'unique-ipfs-paths.txt'
const OUTPUT_FILE = 'retrievable-ipfs-paths.txt'

const queue = new PQueue({ concurrency: CONCURRENCY })

async function checkPath (path: string): Promise<boolean> {
  const url = `http://localhost:8080${path}?format=car`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => { controller.abort() }, TIMEOUT_MS)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (res.status === 200) {
      console.log(`✅ ${path}`)
      await appendFile(OUTPUT_FILE, `${path}\n`)
      return true
    } else {
      console.log(`❌ ${path} (HTTP ${res.status})`)
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log(`⏱️ Timeout: ${path}`)
    } else {
      console.log(`❌ ${path} (Error: ${err.message})`)
    }
  }
  return false
}

async function run (): Promise<void> {
  const rl = createInterface({ input: createReadStream(INPUT_FILE), crlfDelay: Infinity })

  for await (const [...lines] of on(rl, 'line')) {
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed == null || trimmed === '') {
        return
      }

      await queue.add(async () => checkPath(trimmed))
    }
  }

  await once(rl, 'close')
  await queue.onIdle()
}

run().catch(console.error)
