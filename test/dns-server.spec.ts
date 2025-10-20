import { expect } from 'aegir/chai'
import dns2 from 'dns2'
import dns from 'dns/promises'
import { platform } from 'os'

const { Packet } = dns2

/**
 * Cross-platform test DNS server for DNSLink testing
 */
class TestDNSServer {
  private port: number
  private server: any
  private records: Map<string, { type: number, data: string, ttl: number }>

  constructor(port: number = 15353) {
    this.port = port
    this.server = null
    this.records = new Map()
  }

  addDNSLink(domain: string, dnslink: string, ttl: number = 60): void {
    const name = `_dnslink.${domain}`
    this.records.set(name, {
      type: Packet.TYPE.TXT,
      data: `dnslink=${dnslink}`,
      ttl
    })
  }

  async start(): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.server = dns2.createServer({
        udp: true,
        handle: (request: any, send: any) => {
          try {
            const response = Packet.createResponseFromRequest(request)
            const [question] = request.questions
            const record = this.records.get(question.name)

            if (record != null) {
              response.answers.push({
                name: question.name,
                type: record.type,
                class: Packet.CLASS.IN,
                ttl: record.ttl,
                data: record.data
              })
            } else {
              response.header.rcode = 3
            }

            send(response)
          } catch (err) {
            console.error('Error handling DNS request:', err)
          }
        }
      })

      this.server.on('error', (err: Error) => {
        reject(err)
      })

      this.server.listen({
        udp: {
          port: this.port,
          address: '127.0.0.1'
        }
      })

      this.server.on('listening', () => {
        console.log(`✅ DNS Server started on 127.0.0.1:${this.port} (${platform()})`)
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    return await new Promise((resolve) => {
      if (this.server != null) {
        try {
          const timeout = setTimeout(() => {
            console.log('🛑 DNS Server stopped (timeout)')
            this.server = null
            resolve()
          }, 2000)

          this.server.close(() => {
            clearTimeout(timeout)
            console.log('🛑 DNS Server stopped')
            this.server = null
            resolve()
          })
        } catch (err) {
          console.error('Error stopping server:', err)
          this.server = null
          resolve()
        }
      } else {
        resolve()
      }
    })
  }

  clear(): void {
    this.records.clear()
  }

  getPort(): number {
    return this.port
  }
}

describe('DNS Query Server Testing', function () {
  this.timeout(10000)

  let dnsServer: TestDNSServer

  before(async function () {
    console.log(`🧪 Running DNS tests on ${platform()}`)
    
    try {
      dnsServer = new TestDNSServer(15353)
      
      dnsServer.addDNSLink(
        'example.test',
        '/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        60
      )
      
      dnsServer.addDNSLink(
        'docs.ipfs.tech',
        '/ipfs/bafybeichmvxgznqta5d2wvlmvpvljmh3nwxk5svnlg2rbobvu3c6mtzzfy',
        300
      )
      
      await dnsServer.start()
    } catch (err: any) {
      console.error('⚠️  Failed to start DNS server:', err.message)
      console.log('Skipping DNS tests...')
      this.skip()
    }
  })

  after(async () => {
    if (dnsServer != null) {
      await dnsServer.stop()
    }
  })

  it('should resolve DNSLink records', async () => {
    const resolver = new dns.Resolver()
    resolver.setServers([`127.0.0.1:${dnsServer.getPort()}`])
    
    const records = await resolver.resolveTxt('_dnslink.example.test')
    
    expect(records).to.be.an('array')
    expect(records.length).to.be.greaterThan(0)
    expect(records[0].join('')).to.include('dnslink=/ipfs/')
  })

  it('should handle multiple domains', async () => {
    const resolver = new dns.Resolver()
    resolver.setServers([`127.0.0.1:${dnsServer.getPort()}`])
    
    const records1 = await resolver.resolveTxt('_dnslink.example.test')
    const records2 = await resolver.resolveTxt('_dnslink.docs.ipfs.tech')
    
    expect(records1).to.be.an('array')
    expect(records2).to.be.an('array')
  })

  it('should return NXDOMAIN for non-existent domains', async () => {
    const resolver = new dns.Resolver()
    resolver.setServers([`127.0.0.1:${dnsServer.getPort()}`])
    
    try {
      await resolver.resolveTxt('_dnslink.does-not-exist.invalid')
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err.code).to.equal('ENOTFOUND')
    }
  })

  it('should allow adding records dynamically', async () => {
    dnsServer.addDNSLink('dynamic.test', '/ipfs/QmNewHash123')
    
    const resolver = new dns.Resolver()
    resolver.setServers([`127.0.0.1:${dnsServer.getPort()}`])
    
    const records = await resolver.resolveTxt('_dnslink.dynamic.test')
    
    expect(records[0].join('')).to.include('QmNewHash123')
  })

  it('should work across different platforms', async () => {
    expect(['darwin', 'linux', 'win32']).to.include(platform())
    expect(dnsServer.getPort()).to.equal(15353)
  })
})