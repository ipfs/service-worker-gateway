/* eslint-disable no-console */
import { request, createServer } from 'node:http'

const TARGET_HOST = process.env.TARGET_HOST ?? 'localhost'
const backendPort = Number(process.env.BACKEND_PORT ?? 3000)
const proxyPort = Number(process.env.PROXY_PORT ?? 3333)

const setCommonHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, User-Agent, X-Requested-With')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  // Allow framing from any subdomain of localhost
  res.setHeader('Content-Security-Policy', 'frame-ancestors *')
  // res.setHeader('X-Frame-Options', 'SAMEORIGIN')
}

const makeRequest = (options, req, res, attemptRootFallback = false) => {
  options.headers.Host = TARGET_HOST
  const clientIp = req.connection.remoteAddress
  options.headers['X-Forwarded-For'] = clientIp

  const proxyReq = request(options, proxyRes => {
    if (proxyRes.statusCode === 404) {
      if (!attemptRootFallback) {
        // Split the path and pop the last segment
        const pathSegments = options.path.split('/')
        const lastSegment = pathSegments.pop() || ''
        // const newPath = pathSegments.join('/') || '/'

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
    console.error(`Problem with request: ${e.message}`)
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
  console.log(`Proxy server listening on port ${proxyPort}`)
})
