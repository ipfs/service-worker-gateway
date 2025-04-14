import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { doRangeRequest } from './fixtures/do-range-request.js'

test.describe('byte-ranges', () => {
  test.beforeEach(async ({ page }) => {
    // we need to send a request to the service worker to accept the origin isolation warning
    await page.evaluate(async () => {
      const response = await fetch('?ipfs-sw-accept-origin-isolation-warning=true')
      if (!response.ok) {
        throw new Error('Failed to accept origin isolation warning')
      }
    })
  })

  test('should be able to get a single character', async ({ page }) => {
    test.setTimeout(60000)
    const { text, byteSize, statusCode } = await doRangeRequest({ page, range: 'bytes=1-2', path: '/ipfs/bafkqaddimvwgy3zao5xxe3debi' })

    expect(statusCode).toBe(206)
    expect(byteSize).toBe(2)
    expect(text).toBe('el')
  })

  test('can get 0-0 byte range from car with missing data', async ({ page }) => {
    test.setTimeout(60000)
    const result = await doRangeRequest({ page, range: 'bytes=0-0', path: '/ipfs/QmYhmPjhFjYFyaoiuNzYv8WGavpSRDwdHWe5B4M5du5Rtk' })
    const { text, byteSize, statusCode } = result
    expect(statusCode).toBe(206)
    expect(byteSize).toBe(1)
    expect(text).toBe('+')
  })

  test('can get trailing byte range from car with missing data', async ({ page }) => {
    test.setTimeout(60000)
    const { bytes, byteSize, statusCode } = await doRangeRequest({ page, range: 'bytes=2200-', path: '/ipfs/QmYhmPjhFjYFyaoiuNzYv8WGavpSRDwdHWe5B4M5du5Rtk' })
    // TODO: do we need to check the full 872 bytes...?
    const tailBytes = [254, 0, 186, 192, 51, 66, 190, 27, 53, 147, 195, 115, 213, 65, 50, 246, 231, 155, 151, 106, 247, 199, 27, 193, 30, 214, 167, 87, 207, 246, 215, 109, 7, 72, 10, 217, 255, 62, 162, 153, 179, 12, 120, 75, 156, 74, 249, 212, 63, 218, 127, 121, 88, 111, 51, 172, 189, 176, 104, 4, 120, 182, 106, 44, 86, 33, 15, 120, 106, 126, 239, 188, 14, 190, 138, 125, 146, 14, 169, 101, 236, 250, 12, 210, 47, 145, 81, 104, 102, 153, 36, 245, 127, 60, 229, 121, 91, 204, 159, 235, 148, 44, 156, 193, 4, 59, 49, 124, 43, 30, 173, 26, 189, 95, 48, 35, 48, 91, 178, 43, 176, 171, 211, 145, 160, 251, 124, 201, 201, 29, 94, 70, 105, 216, 83, 99, 107, 86, 53, 157, 254, 16, 141, 147, 175, 2, 180, 137, 55, 174, 125, 172, 217, 214, 114, 46, 220, 23, 45, 81, 204, 215, 51, 114, 7, 115, 223, 226, 73, 114, 105, 6, 208, 213, 74, 116, 24, 98, 243, 201, 254, 195, 40, 227, 127, 14, 158, 125, 162, 150, 25, 15, 68, 101, 217, 162, 37, 253, 252, 79, 13, 33, 115, 57, 136, 0, 222, 45, 45, 105, 30, 245, 189, 133, 13, 14, 123, 15, 232, 237, 37, 8, 84, 212, 21, 233, 46, 136, 38, 236, 239, 216, 186, 175, 188, 165, 168, 69, 223, 159, 33, 96, 240, 68, 134, 121, 122, 4, 125, 16, 190, 105, 139, 78, 40, 86, 4, 125, 198, 224, 86, 198, 20, 47, 12, 207, 170, 127, 227, 92, 152, 37, 117, 137, 86, 85, 56, 67, 118, 157, 45, 31, 217, 81, 207, 129, 195, 28, 10, 238, 91, 142, 208, 116, 37, 28, 140, 161, 212, 45, 10, 208, 12, 37, 102, 165, 5, 65, 36, 153, 160, 100, 252, 115, 39, 47, 99, 24, 70, 90, 36, 190, 138, 186, 156, 30, 216, 238, 168, 207, 6, 28, 224, 108, 8, 249, 18, 143, 177, 198, 200, 189, 184, 33, 139, 249, 40, 56, 173, 235, 245, 84, 66, 123, 133, 195, 118, 145, 168, 2, 36, 118, 243, 195, 128, 234, 100, 105, 180, 141, 195, 9, 31, 204, 33, 83, 245, 138, 93, 20, 136, 151, 153, 188, 92, 65, 204, 254, 187, 69, 122, 26, 147, 86, 141, 41, 160, 75, 15, 136, 44, 186, 129, 176, 23, 87, 108, 217, 91, 195, 156, 7, 222, 74, 109, 209, 226, 15, 0, 190, 80, 194, 209, 51, 76, 5, 94, 95, 40, 206, 124, 251, 139, 162, 142, 142, 180, 4, 30, 213, 5, 44, 156, 227, 233, 80, 224, 74, 225, 6, 72, 129, 38, 11, 104, 166, 184, 225, 174, 152, 76, 206, 117, 64, 158, 252, 221, 11, 148, 24, 250, 171, 89, 117, 252, 126, 95, 169, 74, 133, 20, 180, 160, 209, 104, 31, 220, 179, 238, 33, 85, 234, 190, 30, 149, 15, 190, 57, 248, 134, 57, 26, 176, 175, 237, 133, 238, 151, 27, 135, 111, 167, 217, 12, 149, 173, 36, 34, 102, 50, 197, 17, 209, 164, 15, 61, 182, 195, 48, 56, 112, 143, 91, 210, 122, 240, 191, 144, 53, 246, 164, 169, 21, 119, 94, 235, 249, 131, 231, 162, 226, 61, 23, 81, 203, 253, 120, 160, 106, 41, 22, 70, 11, 149, 140, 231, 53, 149, 91, 197, 118, 210, 133, 206, 232, 188, 103, 61, 130, 28, 158, 104, 210, 20, 239, 143, 47, 30, 51, 127, 7, 23, 123, 55, 90, 133, 81, 40, 235, 70, 247, 0, 217, 174, 10, 190, 210, 104, 45, 121, 8, 201, 246, 180, 74, 210, 59, 145, 181, 196, 243, 192, 243, 62, 17, 57, 30, 215, 171, 186, 1, 193, 143, 94, 79, 215, 170, 79, 8, 38, 138, 138, 107, 145, 58, 122, 165, 144, 92, 179, 109, 115, 111, 122, 125, 7, 128, 112, 215, 115, 138, 93, 77, 163, 11, 144, 235, 41, 78, 22, 130, 204, 25, 33, 6, 236, 142, 250, 25, 20, 241, 220, 244, 90, 54, 149, 18, 5, 179, 175, 77, 130, 156, 97, 197, 68, 146, 235, 129, 53, 39, 33, 33, 156, 91, 176, 239, 247, 142, 203, 102, 10, 24, 227, 204, 20, 3, 55, 126, 73, 249, 152, 220, 163, 3, 251, 48, 251, 209, 182, 194, 65, 44, 40, 201, 27, 67, 64, 174, 252, 115, 139, 85, 181, 161, 214, 88, 103, 222, 188, 17, 198, 112, 123, 59, 138, 107, 173, 51, 212, 154, 189, 35, 214, 151, 82, 15, 26, 198, 39, 88, 241, 57, 58, 77, 113, 9, 74, 133, 101, 197, 12, 24, 121, 159, 87, 46, 44, 165, 83, 148, 13, 152, 175, 255, 240, 49, 110, 36, 124, 211, 219, 86, 232, 198, 153, 118, 221, 175, 139, 215, 45, 217, 101, 246, 101, 34, 154, 41, 179, 113, 48, 131, 146, 31, 226, 215, 119, 65, 97, 35, 136, 72, 179, 2, 146, 187, 120, 175, 229, 11, 143, 132, 151, 217, 134, 136, 54, 5, 211, 242, 70, 250, 210, 238, 151, 68, 63, 195, 112, 59, 179, 213, 163, 35, 28, 226, 35, 160, 44, 195, 31]

    expect(statusCode).toBe(206)
    expect(byteSize).toBe(872)
    expect(bytes).toStrictEqual(tailBytes)
  })

  test('video file first set of bytes match kubo gateway', async ({ page }) => {
    const { bytes, byteSize, statusCode } = await doRangeRequest({ page, range: 'bytes=0-100', path: '/ipfs/bafybeie4vcqkutumw7s26ob2bwqwqi44m6lrssjmiirlhrzhs2akdqmkw4' })

    // also fetch from KUBO_GATEWAY to compare
    const response = await fetch(`${process.env.KUBO_GATEWAY}/ipfs/bafybeie4vcqkutumw7s26ob2bwqwqi44m6lrssjmiirlhrzhs2akdqmkw4`, { headers: { range: 'bytes=0-100' } })

    const buffer = await response.arrayBuffer()
    const kuboByteSize = buffer.byteLength
    const kuboBytes = Array.from(new Uint8Array(buffer))
    expect(statusCode).toBe(response.status)
    expect(byteSize).toBe(kuboByteSize)
    expect(bytes).toStrictEqual(kuboBytes)
  })
})
