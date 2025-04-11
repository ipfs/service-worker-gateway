/**
 * serve-deno.ts
 *
 * A Deno version of serve.ts that is intended to be deployed as a production standalone binary.
 * This example embeds the static assets from the `dist` folder and serves them using a custom file server.
 *
 * Compile with:
 *   deno compile --allow-env --allow-net --output service-worker-gateway --include=dist serve-deno.ts
 */

import { serve } from 'https://deno.land/std@0.116.0/http/server.ts'
import { extname } from 'https://deno.land/std@0.116.0/path/mod.ts'
import { createReverseProxy } from './test-e2e/reverse-proxy.ts'

/**
 * serveStaticFile reads the requested file from the bundled assets and returns a Response.
 * It constructs the file URL relative to the embedded `dist` folder using import.meta.url.
 */
export async function serveStaticFile (req: Request): Promise<Response> {
  const url = new URL(req.url)
  let filepath = url.pathname
  if (filepath === '/') {
    filepath = '/index.html'
  }

  // Resolve the file path relative to the embedded "dist" folder.
  let fileUrl: URL
  try {
    fileUrl = new URL(`./dist${filepath}`, import.meta.url)
  } catch (e) {
    // The URL could not be constructed, so return a 404.
    return new Response('Not Found', { status: 404 })
  }

  try {
    // Attempt to read the file from the embedded assets.
    const data = await Deno.readFile(fileUrl)

    // Determine an appropriate content type based on the file extension.
    let contentType = 'text/plain'
    const ext = extname(filepath).toLowerCase()

    switch (ext) {
      case '.html':
        contentType = 'text/html'
        break
      case '.js':
        contentType = 'application/javascript'
        break
      case '.css':
        contentType = 'text/css'
        break
      case '.json':
      case '.map':
        contentType = 'application/json'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.svg':
        contentType = 'image/svg+xml'
        break
      case '.ico':
        contentType = 'image/x-icon'
        break

      default:
        contentType = 'text/plain'
    }

    return new Response(data, {
      headers: { 'content-type': contentType }
    })
  } catch (e) {
    // If the file isn’t found in the embedded bundle, return a 404.
    return new Response('Not Found', { status: 404 })
  }
}

serve(serveStaticFile, { addr: ':3000' })

// Start the reverse proxy.
createReverseProxy({
  proxyPort: 3333,
  backendPort: 3000
})
