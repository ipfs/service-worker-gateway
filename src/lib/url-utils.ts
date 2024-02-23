import { BASE_URL } from './webpack-constants.ts'

/**
 * Given a subdomain url like 'https://subdomain.ipns.helia-sw-gateway.localhost/<possiblePath>', return the string url needed to query the Helia service worker for the content:
 * '/ipns/subdomain[/<possiblePath>]'
 */
export function convertSubdomainUrlToSwFetchUrl (url: string): string {
  const subdomainRegex = /^https?:\/\/(?<content>[^.]+)\.(?<namespace>ip[fn]s)\.[^/]*\/(?<path>.*)$/
  const subdomainMatch = url.match(subdomainRegex)

  if (subdomainMatch?.groups == null) {
    return ''
  }
  const { content, namespace, path } = subdomainMatch?.groups ?? { content: null, namespace: null, path: null }

  return `${window.location.protocol}//${BASE_URL}/${namespace}/${content}/${path}`
}
