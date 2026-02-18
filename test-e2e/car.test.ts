import { test, expect } from './fixtures/config-test-fixtures.ts'
import { makeFetchRequest } from './fixtures/make-range-request.ts'

test.describe('car files', () => {
  test('should respect settings from accept header', async ({ page, baseURL, protocol, host }) => {
    const cid = 'bafybeihchr7vmgjaasntayyatmp5sv6xza57iy2h4xj7g46bpjij6yhrmy'
    const response = await makeFetchRequest(page, `${baseURL}/ipfs/${cid}?format=car`, {
      headers: {
        accept: 'application/vnd.ipld.car; version=1; order=dfs; dups=y'
      }
    })
    expect(response.status()).toBe(200)

    const headers = response.headers()
    expect(headers['content-type']).toContain('application/vnd.ipld.car; version=1; order=dfs; dups=y')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
  })

  test('should use settings from query over accept header', async ({ page, baseURL, protocol, host }) => {
    const cid = 'bafybeihchr7vmgjaasntayyatmp5sv6xza57iy2h4xj7g46bpjij6yhrmy'
    const response = await makeFetchRequest(page, `${baseURL}/ipfs/${cid}?format=car&car-version=1&car-order=dfs&car-dups=y`, {
      headers: {
        accept: 'application/vnd.ipld.car; version=2; order=unk; dups=n'
      }
    })
    expect(response.status()).toBe(200)

    const headers = response.headers()
    expect(headers['content-type']).toContain('application/vnd.ipld.car; version=1; order=dfs; dups=y')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
  })
})
