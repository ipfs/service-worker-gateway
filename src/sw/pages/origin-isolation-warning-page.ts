import { APP_NAME, APP_VERSION, GIT_REVISION } from '../../version.ts'
import { htmlPage } from './page.ts'

/**
 * Shows a warning page to the user, allowing them to accept the risk of
 * accessing a webpage without origin isolation
 */
export function originIsolationWarningPageResponse (location: string): Response {
  const page = htmlPage('No origin isolation', 'originIsolationWarning', {
    location
  })

  return new Response(page, {
    status: 307,
    statusText: 'Temporary Redirect',
    headers: {
      'content-type': 'text/html; charset=utf-8',
      server: `${APP_NAME}/${APP_VERSION}#${GIT_REVISION}`
    }
  })
}
