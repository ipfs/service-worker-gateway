/* eslint-disable no-console */
import { request, createServer } from 'node:http'
import { logger } from '@libp2p/logger'
import debug from 'debug'

// TODO: debug logging is not showing up from this file for some reason.
debug.enable(process.env.DEBUG ?? '')

const log = logger('reverse-proxy')

const TARGET_HOST = process.env.TARGET_HOST ?? 'localhost'
const backendPort = Number(process.env.BACKEND_PORT ?? 3000)
const proxyPort = Number(process.env.PROXY_PORT ?? 3333)
const subdomain = process.env.SUBDOMAIN
const prefixPath = process.env.PREFIX_PATH
const disableTryFiles = process.env.DISABLE_TRY_FILES === 'true'
const X_FORWARDED_HOST = process.env.X_FORWARDED_HOST

const setCommonHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, User-Agent, X-Requested-With')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
}

const makeRequest = (options, req, res, attemptRootFallback = false) => {
  options.headers.Host = TARGET_HOST
  const clientIp = req.connection.remoteAddress
  options.headers['X-Forwarded-For'] = clientIp

  // override path to include prefixPath if set
  if (prefixPath != null) {
    options.path = `${prefixPath}${options.path}`
  }
  if (subdomain != null) {
    options.headers.Host = `${subdomain}.${TARGET_HOST}`
  }
  if (X_FORWARDED_HOST != null) {
    options.headers['X-Forwarded-Host'] = X_FORWARDED_HOST
  }

  // log where we're making the request to
  log('Proxying request to %s:%s%s', options.headers.Host, options.port, options.path)

  const proxyReq = request(options, proxyRes => {
    if (!disableTryFiles && proxyRes.statusCode === 404) { // poor mans attempt to implement nginx style try_files
      if (!attemptRootFallback) {
        // Split the path and pop the last segment
        const pathSegments = options.path.split('/')
        const lastSegment = pathSegments.pop() || ''

        // Attempt to request the last segment at the root
        makeRequest({ ...options, path: `/${lastSegment}` }, req, res, true)
      } else {
        // If already attempted a root fallback, serve index.html
        makeRequest({ ...options, path: '/index.html' }, req, res)
      }
    } else {
      setCommonHeaders(res)
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res, { end: true })
    }
  })

  req.pipe(proxyReq, { end: true })

  proxyReq.on('error', (e) => {
    log.error(`Problem with request: ${e.message}`)
    setCommonHeaders(res)
    res.writeHead(500)
    res.end(`Internal Server Error: ${e.message}`)
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
    hostname: TARGET_HOST,
    port: backendPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers }
  }

  makeRequest(options, req, res)
})

proxyServer.listen(proxyPort, () => {
  log(`Proxy server listening on port ${proxyPort}`)
})
