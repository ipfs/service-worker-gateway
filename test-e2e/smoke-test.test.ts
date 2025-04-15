// see https://github.com/ipfs/service-worker-gateway/issues/502
import { testSubdomainRouting as test, expect } from './fixtures/config-test-fixtures.js'

test.describe('smoke test', () => {
  test('loads a dag-json jpeg', async ({ page, protocol, swResponses }) => {
    await page.goto(`${protocol}//localhost:3334/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`)

    await page.waitForURL('http://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.localhost:3334')
    await page.waitForLoadState('networkidle')

    const response = swResponses[swResponses.length - 1]

    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('image/jpeg')
  })

  test('request to /ipfs/dir-cid redirects to /ipfs/dir-cid/', async ({ page, protocol, swResponses }) => {
    await page.goto(`${protocol}//localhost:3334/ipfs/bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui/root2/root3/root4`)
    await page.waitForURL(`${protocol}//bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui.ipfs.localhost:3334/root2/root3/root4/`)
    await page.waitForLoadState('networkidle')
    const response = swResponses[swResponses.length - 1]
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('text/html; charset=utf-8')
    expect(await response?.text()).toContain('hello')
  })

  /**
   * TODO: address issues mentioned in https://github.com/ipfs/helia-verified-fetch/issues/208
   */
  test('request to /ipfs/dir-cid without index.html returns dir listing', async ({ page, protocol, swResponses }) => {
    await page.goto(`${protocol}//localhost:3334/ipfs/bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui/root2/root3`)
    await page.waitForURL(`${protocol}//bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui.ipfs.localhost:3334/root2/root3/`)
    await page.waitForLoadState('networkidle')
    const response = swResponses[swResponses.length - 1]
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('text/html')
    // there should be a dir listing that has the CID of the root3 node, and the name of the root4 node with a short name

    const header = await page.waitForSelector('main header')
    expect(await header?.innerText()).toContain('Index of root3')
    const headerCid = await header.$('.ipfs-hash')
    expect(await headerCid?.innerText()).toContain('bafybeiawdvhmjcz65x5egzx4iukxc72hg4woks6v6fvgyupiyt3oczk5ja')

    // .grid.dir will have a list of rows (1 in this case) with links to the files in the directory. One link where the name is, and one link with a short hash (.ipfs-hash)
    const gridDir = await page.waitForSelector('.grid.dir')
    const rowCells = await gridDir?.$$('> div') // ideally we would have a better selector for each row, but there is currently no wrapping element for each row
    expect(rowCells?.length).toBe(4)
    const nameLink = await rowCells[1].$('a')
    const shortHashLink = await rowCells[2].$('a')
    expect(await nameLink?.innerText()).toBe('root4')
    expect(await nameLink?.getAttribute('href')).toBe('root4')
    expect(await shortHashLink?.innerText()).toContain('bafy...lo7q')
    expect(await shortHashLink?.getAttribute('href')).toContain('http://localhost:3334/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q?filename=root4')
  })

  /**
   * @see https://github.com/ipfs/service-worker-gateway/issues/662
   */
  test('request to /ipns/<libp2p-key> returns expected content', async ({ page, protocol, swResponses }) => {
    await page.goto(`${protocol}//localhost:3334/ipns/k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam`)
    await page.waitForURL('http://k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam.ipns.localhost:3334')
    await page.waitForLoadState('networkidle')
    const response = swResponses[swResponses.length - 1]
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('text/plain; charset=utf-8')
    expect(await response?.text()).toContain('hello')
  })
})
