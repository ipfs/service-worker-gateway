import { request, createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { logger } from '@libp2p/logger'
import type { Server, ServerResponse, IncomingMessage, RequestOptions, OutgoingHttpHeaders } from 'node:http'

const setCommonHeaders = (res: ServerResponse): void => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, User-Agent, X-Requested-With, Server')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
}

/**
 * Creates and starts a reverse proxy server
 *
 * @param {object} options - Configuration options
 * @param {string} [options.targetHost] - Target host to proxy to (defaults to process.env.TARGET_HOST or 'localhost')
 * @param {number} [options.backendPort] - Port of the backend service (defaults to process.env.BACKEND_PORT or 3000)
 * @param {number} [options.proxyPort] - Port for the proxy to listen on (defaults to process.env.PROXY_PORT or 3333)
 * @param {string} [options.subdomain] - Subdomain to use (defaults to process.env.SUBDOMAIN)
 * @param {string} [options.prefixPath] - Path prefix to add to requests (defaults to process.env.PREFIX_PATH)
 * @param {boolean} [options.disableTryFiles] - Whether to disable try_files behavior (defaults to process.env.DISABLE_TRY_FILES === 'true')
 * @param {string} [options.xForwardedHost] - Value for X-Forwarded-Host header (defaults to process.env.X_FORWARDED_HOST)
 * @param {object} [options.log] - Logger instance to use (defaults to logger('reverse-proxy'))
 * @returns {import('node:http').Server} The HTTP server instance
 */
export function createReverseProxy ({
  targetHost = process.env.TARGET_HOST ?? 'localhost',
  backendPort = Number(process.env.BACKEND_PORT ?? 3000),
  proxyPort = Number(process.env.PROXY_PORT ?? 3333),
  subdomain = process.env.SUBDOMAIN,
  prefixPath = process.env.PREFIX_PATH,
  disableTryFiles = process.env.DISABLE_TRY_FILES === 'true',
  xForwardedHost = process.env.X_FORWARDED_HOST,
  log = logger('reverse-proxy')
} = {}): Server {
  const makeRequest = (options: RequestOptions & { headers: OutgoingHttpHeaders }, req: IncomingMessage, res: ServerResponse, attemptRootFallback = false): void => {
    if (options.headers == null) {
      options.headers = {}
    }
    options.headers.Host = targetHost
    const clientIp = req.connection.remoteAddress
    options.headers['X-Forwarded-For'] = clientIp

    // override path to include prefixPath if set
    if (prefixPath != null) {
      options.path = `${prefixPath}${options.path}`
    }
    if (subdomain != null) {
      options.headers.Host = `${subdomain}.${targetHost}`
    }
    if (xForwardedHost != null) {
      options.headers['X-Forwarded-Host'] = xForwardedHost
    }

    // log where we're making the request to
    log('Proxying request from %s:%s to %s:%s%s', req.headers.host, req.url, options.headers.Host, options.port, options.path)

    const proxyReq = request(options, proxyRes => {
      if (!disableTryFiles && proxyRes.statusCode === 404) { // poor mans attempt to implement nginx style try_files
        if (!attemptRootFallback) {
          // Split the path and pop the last segment
          const pathSegments = options.path?.split('/') ?? []
          const lastSegment = pathSegments.pop() ?? ''

          // Attempt to request the last segment at the root
          makeRequest({ ...options, path: `/${lastSegment}` }, req, res, true)
        } else {
          // If already attempted a root fallback, serve index.html
          makeRequest({ ...options, path: '/index.html' }, req, res)
        }
      } else {
        setCommonHeaders(res)
        res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers)
        proxyRes.pipe(res, { end: true })
      }
    })

    req.pipe(proxyReq, { end: true })

    proxyReq.on('error', (err) => {
      log.error('problem with request - %e', err)
      setCommonHeaders(res)
      res.writeHead(500)
      res.end(`Internal Server Error: ${err.message}`)
    })
  }

  const proxyServer = createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      setCommonHeaders(res)
      res.writeHead(200)
      res.end()
      return
    }

    const options = {
      hostname: targetHost,
      port: backendPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers }
    }

    makeRequest(options, req, res)
  })

  proxyServer.listen(proxyPort, () => {
    log(`Proxy server listening on port ${proxyPort}, pointing to ${targetHost}:${backendPort}`)
  })

  return proxyServer
}

// Run main function if this file is being executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  createReverseProxy()
}
