/**
 * Returns a redirect to the content viewer. Currently only used for Safari.
 */
export async function getContentViewerResponse (response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type')
  const ipfsPath = response.headers.get('X-Ipfs-Path')

  return new Response(null, {
    status: 307,
    headers: {
      'location': `/ipfs-sw-content-viewer.html?type=${contentType}&ipfsPath=${ipfsPath}`,
      'Content-Type': 'text/html',
      'ipfs-sw': 'true',
      'ipfs-sw-debug': 'true'
    }
  })
}
