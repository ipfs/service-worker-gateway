import { APP_NAME, APP_VERSION, GIT_REVISION } from '../../version.ts'
import { htmlPage } from './page.ts'
import type { ContentURI } from '../../lib/parse-request.ts'
import type { Providers as ErrorPageProviders } from '../../ui/pages/fetch-error.tsx'
import type { Providers } from '../index.ts'

declare let self: ServiceWorkerGlobalScope

/**
 * When returning a meaningful error page, we provide the following details about
 * the service worker
 */
interface ServiceWorkerDetails {
  crossOriginIsolated: boolean
  installTime: string
  origin: string
  scope: string
  state: string
  version: string
  commit: string
}

/**
 * TODO: more service worker details
 */
function getServiceWorkerDetails (firstInstallTime: number): ServiceWorkerDetails {
  const registration = self.registration
  const state = registration.installing?.state ?? registration.waiting?.state ?? registration.active?.state ?? 'unknown'

  return {
    // TODO: implement https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
    crossOriginIsolated: self.crossOriginIsolated,
    installTime: (new Date(firstInstallTime)).toUTCString(),
    origin: self.location.origin,
    scope: registration.scope,
    state,
    version: APP_VERSION,
    commit: GIT_REVISION
  }
}

function toErrorPageProviders (providers: Providers): ErrorPageProviders {
  const output: ErrorPageProviders = {
    total: providers.total,
    other: providers.other,
    otherCount: providers.otherCount,
    trustlessGateway: [...providers.trustlessGateway],
    bitswap: {}
  }

  for (const [key, addresses] of providers.bitswap) {
    output.bitswap[key] = [...addresses]
  }

  return output
}

export interface RequestDetails {
  resource: URL
  method: string
  headers: Record<string, string>
}

function getRequestDetails (request: ContentURI, init: RequestInit): RequestDetails {
  const requestHeaders = new Headers(init.headers)
  const headers: Record<string, string> = {}
  requestHeaders.forEach((value, key) => {
    headers[key] = value
  })

  return {
    resource: request.subdomainURL,
    method: init.method ?? 'GET',
    headers
  }
}

export interface ResponseDetails {
  resource: string,
  headers: Record<string, string>
  status: number
  statusText: string
  body: string
}

function getResponseDetails (response: Response, body: string): ResponseDetails {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    resource: response.url,
    headers,
    status: response.status,
    statusText: response.statusText,
    body
  }
}

/**
 * Shows an error page to the user
 */
export function fetchErrorPageResponse (request: ContentURI, requestInit: RequestInit, fetchResponse: Response, responseBody: string, providers: Providers, installTime: number, logs: string[]): Response {
  const responseContentType = fetchResponse.headers.get('Content-Type')

  if (responseContentType?.includes('text/html')) {
    return fetchResponse
  }

  const responseDetails = getResponseDetails(fetchResponse, responseBody)
  const mergedHeaders = new Headers(fetchResponse.headers)
  mergedHeaders.set('content-type', 'text/html; charset=utf-8')
  mergedHeaders.set('server', `${APP_NAME}/${APP_VERSION}#${GIT_REVISION}`)

  const props = {
    request: getRequestDetails(request, requestInit),
    response: responseDetails,
    config: getServiceWorkerDetails(installTime),
    providers: toErrorPageProviders(providers),
    title: `${responseDetails.status} ${responseDetails.statusText}`,
    logs
  }

  const page = htmlPage(props.title, 'fetchError', props)
  mergedHeaders.set('content-length', `${page.length}`)

  return new Response(page, {
    status: fetchResponse.status,
    statusText: fetchResponse.statusText,
    headers: mergedHeaders
  })
}
