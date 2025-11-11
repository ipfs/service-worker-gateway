import { htmlPage } from './page.js'

function isAggregateError (obj?: any): obj is AggregateError {
  return obj?.name === 'AggregateError' || obj instanceof AggregateError
}

function toErrorObject (error: any): any {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    cause: error.cause,
    reason: error.reason,
    errors: isAggregateError(error) ? error.errors.map(e => toErrorObject(e)) : undefined
  }
}

/**
 * Shows an error page to the user
 */
export function serverErrorPageResponse (url: URL, error: Error, logs: string[]): Response {
  const headers = new Headers()
  headers.set('Content-Type', 'text/html')
  headers.set('ipfs-sw', 'true')
  headers.set('x-debug-request-uri', url.toString())

  const props = {
    url: url.toString(),
    error: toErrorObject(error),
    title: '500 Internal Server Error',
    logs
  }

  const page = htmlPage(props.title, 'serverError', props)

  return new Response(page, {
    status: 500,
    headers
  })
}
