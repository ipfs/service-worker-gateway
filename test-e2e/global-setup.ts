import bodyParser from 'body-parser'
import cors from 'cors'
import polka from 'polka'
import { serve } from '../serve.ts'
import { DNSRecordCache, toResourceRecordType } from './fixtures/dns-record-cache.ts'

export default async function globalSetup (config: Record<string, any>): Promise<void> {
  process.env.PLAYWRIGHT = 'true'

  const {
    controller
  } = await serve({
    shouldLoadFixtures: true,
    shouldStartFrontend: false
  })

  const info = await controller.info()

  process.env.KUBO_PID = `${info.pid}`
  process.env.KUBO_GATEWAY = info.gateway
  process.env.KUBO_RPC = info.api

  const dnsRecords = new DNSRecordCache()

  const apiServer = polka()
    .use(bodyParser.json())
    .use(cors())
    .use((req, res, next) => {
      // @ts-expect-error not a field
      res.json = d => {
        if (res.getHeader('content-type') == null) {
          res.setHeader('content-type', 'application/json')
        }

        res.end(JSON.stringify(d))
      }
      next()
    })
    .post('/dns-record/:domain', (req, res) => {
      dnsRecords.put(Array.isArray(req.params.domain) ? req.params.domain[0] : req.params.domain, req.body.type, req.body.data, req.body.ttl)

      res.end()
    })
    .delete('/dns-record/:domain', (req, res) => {
      dnsRecords.delete(req.params.domain)

      res.end()
    })
    .get('/dns-query', (req, res) => {
      const records = dnsRecords.get(
        `${req.query.name}`,
        req.query.type?.toString()
      )

      res.setHeader('content-type', 'application/dns-json')

      res.json({
        // @see https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-6
        Status: records.length > 0 ? 0 : 3,

        // @see https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/#successful-response
        TC: false,
        RD: true,
        RA: true,
        AD: true,
        CD: false,
        Question: [{
          name: `${req.query.name}`,
          type: toResourceRecordType(req.query.type != null ? `${req.query.type}` : undefined) ?? 1
        }],
        Answer: records.map(record => ({
          name: `${req.query.name}`,
          data: record.data,
          type: record.type,
          TTL: Math.round((record.expires - Date.now()) / 1000)
        }))
      })
    })

  await new Promise((resolve) => {
    apiServer.listen(0, () => {
      resolve(true)
    })
  })

  process.env.DNS_JSON_SERVER = `http://127.0.0.1:${getPort(apiServer)}/dns-query`
  process.env.TEST_API_SERVER = `http://127.0.0.1:${getPort(apiServer)}`

  config.userData = {
    apiServer
  }
}

function getPort (server: polka.Polka): number {
  const address = server.server?.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Server was not listening')
  }

  return address.port
}
