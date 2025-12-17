import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'
import { setConfig } from './fixtures/set-sw-config.ts'

test.describe('ipns', () => {
  test.beforeEach(async ({ page }) => {
    await setConfig(page, {
      gateways: [
        `${process.env.KUBO_GATEWAY}`
      ],
      routers: [
        `${process.env.KUBO_GATEWAY}`
      ],
      acceptOriginIsolationWarning: true
    })
  })

  test('should resolve IPNS name and return as dag-json', async ({ page, protocol, rootDomain }) => {
    const name = 'k51qzi5uqu5dhjghbwdvbo6mi40htrq6e2z4pwgp15pgv3ho1azvidttzh8yy2'
    const cid = 'baguqeeram5ujjqrwheyaty3w5gdsmoz6vittchvhk723jjqxk7hakxkd47xq'

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipns/${name}?format=dag-json`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${name}.ipns.${rootDomain}?format=dag-json` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers?.['content-type']).toContain('application/vnd.ipld.dag-json')
    expect(headers?.['cache-control']).toBe('public, max-age=3155760000')
    expect(headers?.['etag']).toBe(`"${cid}.dag-json"`)
    expect(headers?.['x-ipfs-path']).toBe(`/ipns/${name}`)

    expect(await response?.json()).toStrictEqual({
      foo: {
        link: {
          '/': 'baguqeeraxpdqyfizawpb7zl5gnpg7jw3myuynb42ngzmeo7xn5kmm5pabt6q'
        },
        object: {
          banana: 10,
          monkey: false
        }
      }
    })
  })
})
