/**
 * This is a simple reverse proxy that makes sure that any request to localhost:3333 is forwarded to localhost:3000.
 *
 * This mimicks the type of setup you need in nginx or fronting server to the helia-service-worker-gateway in order
 * to handle subdomain requests and origin isolation.
 */
import httpProxy from 'http-proxy'

const backendPort = Number(process.env.BACKEND_PORT ?? 3000)
const proxyPort = Number(process.env.PROXY_PORT ?? 3333)

const proxy = httpProxy.createProxyServer({
  target: {
    host: 'localhost',
    port: backendPort
  }
})

proxy.on('proxyRes', (proxyRes, req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('access-control-allow-headers', 'Content-Type, Range, User-Agent, X-Requested-With')
  res.setHeader('access-control-allow-methods', 'GET, HEAD, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
  }
})

proxy.listen(proxyPort)

// eslint-disable-next-line no-console
console.log('reverse proxy forwarding localhost traffic from port %d to %d', proxyPort, backendPort)
