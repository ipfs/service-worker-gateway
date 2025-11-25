import { createServer } from 'node:http'
import { enable } from '@libp2p/logger'
import { createKuboNode } from './create-kubo.ts'
import { loadKuboFixtures } from './kubo-mgmt.ts'

const KUBO_PORT = 8088
const DNS_JSON_PORT = 3335

export default async function globalSetup (): Promise<void> {
  enable('*,*:trace,-pw:*,-reverse-proxy*,-ipfs-gateway*')

  process.env.PLAYWRIGHT = 'true'

  // set up kubo server
  // The Kubo gateway will be passed to the VerifiedFetch config
  const {
    node: kuboNode,
    repoPath
  } = await createKuboNode(KUBO_PORT)

  await kuboNode.start()

  const IPFS_NS_MAP = await loadKuboFixtures(repoPath)

  const dnsMap: Record<string, string> = {}

  IPFS_NS_MAP.split(',').forEach(name => {
    const [key, value] = name.split(':')

    dnsMap[key] = value
  })

  // set up DNS JSON server
  const dnsJsonServer = createServer((req, res) => {
    // https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/
    const url = new URL(req.url ?? '')
    const name = url.searchParams.get('name')
    const type = url.searchParams.get('type') ?? 'A'

    if (name == null || type == null) {
      res.statusCode = 400
      res.end('Missing name and/or type query params')
      return
    }

    if (type !== 'TXT') {
      res.statusCode = 400
      res.end('Can only respond with TXT records')
      return
    }

    const answers = []

    if (dnsMap[name] != null) {
      answers.push([{
        name,
        type: 16,
        TTL: 180,
        data: `dnslink=${dnsMap[name]}`
      }])
    }

    res.end(JSON.stringify({
      Status: 0,
      TC: false,
      RD: false,
      RA: false,
      AD: true,
      CD: true,
      Question: [{
        name,
        type: 16
      }],
      Answer: answers
    }, null, 2))
  })

  await new Promise<void>(resolve => {
    dnsJsonServer.listen(DNS_JSON_PORT, () => {
      resolve()
    })
  })

  process.on('exit', () => {
    dnsJsonServer?.close()
    dnsJsonServer?.closeAllConnections()
  })

  const info = await kuboNode.info()

  process.env.KUBO_PID = `${info.pid}`
  process.env.KUBO_GATEWAY = info.gateway
  process.env.KUBO_REPO_DIR = info.repo
  process.env.DNS_JSON_RESOLVER = `127.0.0.1:${DNS_JSON_PORT}`
}
