import { existsSync, createReadStream } from 'node:fs'
import { createServer, Server } from 'node:http'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const HTTP_PORT = 3000

const MIME_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf8',
  '.png': 'image/png',
  '.map': 'text/plain',
  '.css': 'text/css; charset=utf8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf8',
  '.html': 'text/html; charset=utf8'
}

/**
 * create a web server that serves an asset if it exists or index.html if not,
 * this simulates the behaviour of Cloudflare with `./dist/_redirects`
 */
export async function createHttpServer (port = HTTP_PORT): Promise<Server> {
  const server = createServer((req, res) => {
    let file = req.url

    if (file == null || file === '/') {
      file = 'index.html'
    }

    let asset = join(__dirname, '../../../dist', file)

    if (!existsSync(asset)) {
      // serve index.html instead of 404ing
      asset = join(__dirname, '../../../dist/index.html')
    }

    res.statusCode = 200
    res.setHeader('content-type', MIME_TYPES[extname(asset)] ?? 'application/octet-stream')
    createReadStream(asset).pipe(res)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', err => {
      reject(err)
    })
    server.listen(port, () => {
      resolve()
    })
  })

  return server
}
