import { create as createKuboRpcClient } from 'kubo-rpc-client'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { WebSocket as NodeWebSocket } from 'undici'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadBypassingMediaViewer } from './fixtures/media-viewer.ts'
import type { Route } from '@playwright/test'
import type { MessageEvent } from 'undici'

/**
 * The main test Kubo (http://127.0.0.1:8088) serves as both the HTTP
 * trustless gateway and the bitswap peer (via its WS and WT listeners).
 * Per-test: the HTTP gateway path is blocked (page.route → 500) so the SW
 * falls back to bitswap, and the delegated-routing endpoint is mocked to
 * return only the transport address(es) under test (WS, WSS, WT, or a mix).
 *
 * Playwright intercepts service-worker fetch() calls via page.route(), and
 * routes registered inside a test body take LIFO priority over the catch-all
 * in config-test-fixtures.ts.
 */
const MAIN_KUBO = 'http://127.0.0.1:8088'

test.describe('bitswap block retrieval', () => {
  let testCidStr: string
  let kuboPeerId: string
  let wsAddr: string   // /ip4/127.0.0.1/tcp/PORT/ws
  let wsPort: number   // TCP port extracted from wsAddr
  let wssAddr: string  // wsAddr with /ws → /wss; Playwright proxies wss:// to ws://
  let wtAddr: string   // /ip4/127.0.0.1/udp/PORT/quic-v1/webtransport/certhash/…

  test.beforeAll(async () => {
    // Connect to the already-running main test Kubo via its RPC endpoint.
    // global-setup.ts starts the node and sets process.env.KUBO_RPC.
    const kuboRpc = createKuboRpcClient(process.env.KUBO_RPC)

    const { cid } = await kuboRpc.add(
      uint8ArrayFromString('hello from bitswap'),
      { cidVersion: 1 }
    )
    testCidStr = cid.toString()

    const id = await kuboRpc.id()
    kuboPeerId = id.id.toString()

    const addrStrings = (await kuboRpc.swarm.localAddrs()).map(ma => ma.toString())

    const found = {
      ws: addrStrings.find(s => s.endsWith('/ws')),
      wt: addrStrings.find(s => s.includes('/quic-v1/webtransport'))
    }
    if (found.ws == null || found.wt == null) {
      throw new Error(
        `Expected WS and WebTransport addrs in localAddrs(), got:\n  ${addrStrings.join('\n  ')}`
      )
    }
    wsAddr = found.ws
    wsPort = parseInt(wsAddr.split('/tcp/')[1].split('/')[0], 10)
    wssAddr = wsAddr.replace(/\/ws$/, '/wss')
    wtAddr = found.wt
  })

  /**
   * Block the HTTP trustless-gateway path so bitswap is the only option.
   * The main Kubo has the test block, so without this the SW would succeed
   * over HTTP and never exercise the bitswap path.
   */
  async function mockGateway500 (page: any): Promise<void> {
    await page.context().route(`${MAIN_KUBO}/ipfs/**`, async (route: Route) => {
      await route.fulfill({ status: 500 })
    })
  }

  /**
   * Mock the delegated-routing endpoint so the SW discovers the main Kubo as
   * a bitswap provider reachable at the given multiaddrs. Registered after
   * the page fixture's catch-all route, so it takes LIFO priority.
   */
  async function mockRouting (page: any, peerAddrs: string[]): Promise<void> {
    const addrs = peerAddrs.map(addr => addr.includes('/p2p/') ? addr : `${addr}/p2p/${kuboPeerId}`)
    const routeTarget = page.context()

    // Mock out peer routing so it doesn't interfere with limitations imposed by
    // the custom content routing
    await routeTarget.route(
      `${MAIN_KUBO}/routing/v1/peers/**`,
      async (route: Route) => {
        await route.fulfill({ status: 404 })
      }
    )

    await routeTarget.route(
      `${MAIN_KUBO}/routing/v1/providers/**`,
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Providers: [{
              Schema: 'peer',
              ID: kuboPeerId,
              Addrs: addrs,
              Protocols: ['transport-bitswap']
            }]
          })
        })
      }
    )
  }

  /**
   * Intercept wss:// WebSocket connections from the service worker and proxy
   * them to the plain ws:// Kubo node on the same port.
   *
   * Kubo does not auto-generate TLS certs for WSS listeners, so we advertise
   * the plain WS port with a /wss suffix and let Playwright's routeWebSocket
   * (CDP-based) terminate the "TLS" before it even reaches the network.
   */
  async function mockWss (page: any, port: number): Promise<void> {
    await page.routeWebSocket(
      (url: URL) => url.protocol === 'wss:' && url.hostname === '127.0.0.1' && url.port === String(port),
      (wsRoute: any) => {
        const pending: (string | Buffer)[] = []
        const server = new NodeWebSocket(`ws://127.0.0.1:${port}`)
        server.binaryType = 'arraybuffer'

        wsRoute.onMessage((msg: string | Buffer) => {
          if (server.readyState === NodeWebSocket.OPEN) {
            server.send(msg)
          } else {
            pending.push(msg)
          }
        })

        server.addEventListener('open', () => {
          for (const msg of pending) { server.send(msg) }
          pending.length = 0
          server.addEventListener('message', (evt: MessageEvent<string | ArrayBuffer>) => {
            const data = typeof evt.data === 'string' ? evt.data : Buffer.from(evt.data)
            void wsRoute.send(data)
          })
        })

        wsRoute.onClose(() => { server.close() })
        server.addEventListener('close', () => { void wsRoute.close() })
        server.addEventListener('error', () => { void wsRoute.close() })
      }
    )
  }

  test('retrieves content via bitswap over WS', async ({ page, baseURL }) => {
    await mockGateway500(page)
    await mockRouting(page, [wsAddr])

    const response = await loadBypassingMediaViewer(page, `${baseURL}/ipfs/${testCidStr}`)
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('hello from bitswap')
  })

  test('retrieves content via bitswap over WebTransport', async ({ page, baseURL }) => {
    await mockGateway500(page)
    await mockRouting(page, [wtAddr])

    const response = await loadBypassingMediaViewer(page, `${baseURL}/ipfs/${testCidStr}`)
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('hello from bitswap')
  })

  /**
   * Additional transport coverage: WSS.
   *
   * Kubo listens on plain WS (/ws). We advertise the same port as /wss in the
   * routing response. page.routeWebSocket() (CDP-based, Chromium) intercepts
   * the wss:// connection from the service worker and proxies it to ws:// on
   * the same port — no TLS cert infrastructure required.
   *
   * Skipped on non-Chromium: page.routeWebSocket() currently requires
   * Chromium's CDP. WSS itself works in all browsers.
   */
  test('retrieves content via bitswap over WSS (Playwright WS proxy)', async ({ page, baseURL }) => {
    test.skip(test.info().project.name !== 'chromium', 'page.routeWebSocket() requires Chromium CDP')
    await mockGateway500(page)
    await mockWss(page, wsPort)
    await mockRouting(page, [wssAddr])

    const response = await loadBypassingMediaViewer(page, `${baseURL}/ipfs/${testCidStr}`)
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('hello from bitswap')
  })

  test('retrieves content via bitswap when routing returns both WS and WT addresses', async ({ page, baseURL }) => {
    await mockGateway500(page)
    await mockRouting(page, [wsAddr, wtAddr])

    const response = await loadBypassingMediaViewer(page, `${baseURL}/ipfs/${testCidStr}`)
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('hello from bitswap')
  })
})
