/**
 * Error page HTML generation for IPFS Service Worker Gateway
 * Generates inline error pages matching the original 504.html styling
 */

import type { ErrorInfo, ErrorType } from './error-types.js'

/**
 * Configuration for error page generation
 */
export interface ErrorPageConfig {
  status: number
  statusText: string
  url: string
  cid: string | null
  errorType: ErrorType | string
  errorMessage: string
  suggestions: string[]
  stack?: string
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml (unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const TACHYONS_CSS = `
  body { margin: 0; }
  .f4 { font-size: 1rem; }
  .f3 { font-size: 1.25rem; }
  .f2 { font-size: 2rem; }
  .fw2 { font-weight: 300; }
  .pa2 { padding: .5rem; }
  .pa3 { padding: 1rem; }
  .pa4-l { padding: 2rem; }
  .ma0 { margin: 0; }
  .ma3 { margin: 1rem; }
  .mv5-l { margin-top: 3rem; margin-bottom: 3rem; }
  .mh0 { margin-left: 0; margin-right: 0; }
  .mw7 { max-width: 60rem; }
  .pb1 { padding-bottom: .25rem; }
  .ph2 { padding-left: .5rem; padding-right: .5rem; }
  .tc { text-align: center; }
  .ttu { text-transform: uppercase; }
  .v-top { vertical-align: top; }
  .inline-flex { display: inline-flex; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .flex { display: flex; }
  .bn { border: none; }
  .br2 { border-radius: .25rem; }
  .bg-navy { background-color: #001b3a; }
  .bg-snow { background-color: #fffffe; }
  .bg-teal { background-color: #0b7285; }
  .bb { border-bottom-style: solid; }
  .bw3 { border-width: 3px; }
  .b--aqua { border-color: #69c4cd; }
  .aqua { color: #69c4cd; }
  .gray { color: #8a8a8a; }
  .white { color: #fff; }
  .sans-serif { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  .no-underline { text-decoration: none; }
  .dn { display: none; }
  .dib { display: inline-block; }
  .center { margin-left: auto; margin-right: auto; }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.5;
  }
  a { color: #0b3a53; }
  ul { padding-left: 1.5rem; line-height: 1.6; }
  strong { font-weight: 600; }
  
  @media screen and (min-width: 60em) {
    .pa4-l { padding: 2rem; }
    .mv5-l { margin-top: 3rem; margin-bottom: 3rem; }
  }
`

export function generateErrorPageHTML (config: ErrorPageConfig): string {
  const { status, statusText, errorMessage, suggestions, cid } = config

  const suggestionsList = suggestions.map(s => `<li>${escapeHtml(s)}</li>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta name="description" content="Error ${status} (${statusText}) when trying to fetch content from the IPFS network.">
    <title>${status} ${statusText}</title>
    <style>${TACHYONS_CSS}</style>
</head>
<body class="f4">
    <header class="e2e-header flex items-center pa2 bg-navy bb bw3 b--aqua tc justify-between">
      <div>
        <a href="https://ipfs.tech" title="IPFS Project" target="_blank" rel="noopener noreferrer">
            <img alt='IPFS logo' id="ipfs-logo" src="data:image/svg+xml,%3Csvg%20width%3D%22514%22%20height%3D%22514%22%20viewBox%3D%220%200%20514%20514%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%20%20%3Ctitle%3E%0A%20%20%20%20%20%20%20%20ipfs-logo-on%0A%20%20%20%20%3C%2Ftitle%3E%0A%20%20%20%20%3Cg%20fill-rule%3D%22nonzero%22%20fill%3D%22none%22%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20fill%3D%22%234A9EA1%22%20d%3D%22M36.298%20385l221.7%20128%20221.7-128V129L257.998%201.01l-221.7%20128z%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M235.113%2031.84l-160.74%2092.806a38.396%2038.396%200%200%201%200%208.59l160.75%2092.805c13.554-10%2032.043-10%2045.597%200l160.75-92.807a38.343%2038.343%200%200%201-.001-8.588L280.729%2031.84c-13.554%2010.001-32.044%2010.001-45.599%200h-.017zm221.79%20127.03l-160.92%2093.84c1.884%2016.739-7.361%2032.751-22.799%2039.489l.18%20184.58a38.386%2038.386%200%200%201%207.439%204.294l160.75-92.805c-1.884-16.739%207.36-32.752%2022.799-39.49v-185.61a38.397%2038.397%200%200%201-7.44-4.294l-.009-.004zm-397.81%201.031a38.387%2038.387%200%200%201-7.438%204.296v185.61c15.438%206.738%2024.683%2022.75%2022.799%2039.489l160.74%2092.806a38.4%2038.4%200%200%201%207.44-4.295v-185.61c-15.439-6.738-24.684-22.75-22.8-39.49l-160.74-92.81-.001.005z%22%20fill%3D%22%2363D3D7%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%23000%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cpath%20fill-opacity%3D%22.251%22%20d%3D%22M258%20513l221.7-128V129L258%20257z%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cpath%20fill-opacity%3D%22.039%22%20d%3D%22M258%20513V257L36.3%20129v256z%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cpath%20fill-opacity%3D%22.13%22%20d%3D%22M36.298%20129l221.7%20128%20221.7-128-221.7-128z%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E%0A" style="height: 50px;" class="v-top" />
        </a>
      </div>
      <div class="pb1 ma0 inline-flex items-center">
        <h1 class="e2e-header-title f3 fw2 aqua ttu sans-serif">Service Worker Gateway <small class="gray">(beta)</small></h1>
      </div>
    </header>
    <main id="main" class="pa2 pa4-l bg-snow mw7 mv5-l center">
        <header>
            <strong class="f2">${status} ${escapeHtml(statusText)}</strong>
        </header>
        <section class="container">
            ${cid
? `
            <p><strong>Requested CID:</strong></p>
            <p><code>${escapeHtml(cid)}</code></p>
            `
: ''}
            
            <!-- ✅ USE DYNAMIC ERROR MESSAGE -->
            <p><strong>What went wrong:</strong></p>
            <p>${escapeHtml(errorMessage)}</p>
            
            <!-- ✅ USE DYNAMIC SUGGESTIONS -->
            ${suggestions.length > 0
? `
            <p><strong>How you can proceed:</strong></p>
            <ul>
                ${suggestionsList}
            </ul>
            `
: ''}
            
            <p><strong>Additional resources:</strong></p>
            <ul>
                <li>Self-host and run an <a href="https://docs.ipfs.tech/concepts/ipfs-implementations/" target="_blank" rel="noopener noreferrer">IPFS client</a> that verifies your data.</li>
                <li>Try diagnosing your request with the <a href="https://docs.ipfs.tech/reference/diagnostic-tools/" target="_blank" rel="noopener noreferrer">IPFS diagnostic tools</a>.</li>
                <li>Inspect the <a href="https://cid.ipfs.tech/" target="_blank" rel="noopener noreferrer">CID</a> or <a href="https://explore.ipld.io/" target="_blank" rel="noopener noreferrer">DAG</a>.</li>
                <li>Increase the timeout in the <a href="/#/ipfs-sw-config" target="_blank" rel="noopener noreferrer">config page</a> for this Service Worker Gateway instance.</li>
            </ul>
            
            ${cid ? `<a class="check-cid-link no-underline br2 f4 bn bg-teal white pa3 ph2 ma3 mh0" href="https://check.ipfs.network/?cid=${escapeHtml(cid)}" target="_blank" rel="noopener noreferrer">Debug retrievability of CID</a>` : ''}
        </section>
    </main>
    <script>
      const subdomainRegex = /^(?:https?:\\/\\/|\\/\\/)?(?<cid>[^/]+)\\.ipfs\\.(?<parentDomain>[^/?#]*)(?<path>.*)$/;
      const pathRegex = /^.*\\/ipfs\\/(?<cid>[^/?#]*)(?<path>.*)$/;

      function checkUrl() {
        const currentUrl = window.location.href;
        let match = currentUrl.match(pathRegex) || currentUrl.match(subdomainRegex);

        if (match?.groups?.cid != null) {
          const cid = match.groups.cid;
          const anchor = document.querySelector('.check-cid-link');
          if (anchor) {
            anchor.href = 'https://check.ipfs.network/?cid=' + cid;
            anchor.classList.remove('dn');
            anchor.classList.add('dib');
          }
        }
      }
      checkUrl();
    </script>
</body>
</html>`
}

/**
 * Generate error page from ErrorInfo object
 *
 * @param errorInfo - Error information from detectErrorType
 * @param url - Request URL
 * @param cid - Extracted CID (optional)
 * @param stack - Stack trace (optional)
 * @returns Complete HTML error page
 */
export function generateErrorPageFromInfo (
  errorInfo: ErrorInfo,
  url: string,
  cid: string | null,
  stack?: string
): string {
  return generateErrorPageHTML({
    status: errorInfo.statusCode,
    statusText: getStatusText(errorInfo.statusCode),
    url,
    cid,
    errorType: errorInfo.errorType,
    errorMessage: errorInfo.errorMessage,
    suggestions: errorInfo.suggestions,
    stack
  })
}

/**
 * Get HTTP status text for status code
 */
function getStatusText (status: number): string {
  const statusTexts: Record<number, string> = {
    400: 'Bad Request',
    404: 'Not Found',
    415: 'Unsupported Media Type',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  }
  return statusTexts[status] || 'Error'
}
