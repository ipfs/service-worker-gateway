import { APP_NAME, APP_VERSION, GIT_REVISION } from '../../version.js'
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

export interface ServerErrorPageResponseOptions {
  /**
   * HTTP status code
   *
   * @default 500
   */
  status?: number

  /**
   * Error title to show on page
   *
   * @default '500 Internal Server Error'
   */
  title?: string
}

/**
 * Shows an error page to the user
 */
export function serverErrorPageResponse (url: URL, error: Error, logs: string[], opts?: ServerErrorPageResponseOptions): Response {
  const headers = new Headers()
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('x-debug-request-uri', url.toString())
  headers.set('server', `${APP_NAME}/${APP_VERSION}#${GIT_REVISION}`)

  const props = {
    url: url.toString(),
    error: toErrorObject(error),
    title: opts?.title ?? '500 Internal Server Error',
    logs
  }

  const page = htmlPage(props.title, 'serverError', props)

  return new Response(page, {
    status: opts?.status ?? 500,
    headers
  })
}
