/**
 * Error page HTML generation for IPFS Service Worker Gateway
 * 
 * This module generates user-friendly error pages with detailed information,
 * actionable suggestions, and debugging tools.
 * 
 * @module error-pages
 */

import type { ErrorInfo, ErrorType } from './error-types.js'

/**
 * Configuration for error page generation
 */
export interface ErrorPageConfig {
  /** HTTP status code */
  status: number
  /** HTTP status text */
  statusText: string
  /** Full request URL that caused the error */
  url: string
  /** Extracted CID from the URL (if applicable) */
  cid: string | null
  /** Error type classification */
  errorType: ErrorType | string
  /** User-friendly error message */
  errorMessage: string
  /** List of actionable suggestions */
  suggestions: string[]
  /** Optional stack trace for debugging */
  stack?: string
}

/**
 * Generate complete HTML for error page
 * 
 * @param config - Error page configuration
 * @returns Complete HTML document as string
 */
export function generateErrorPageHTML(config: ErrorPageConfig): string {
  const {
    status,
    statusText,
    url,
    cid,
    errorType,
    errorMessage,
    suggestions,
    stack
  } = config

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Error ${status} - ${errorType}">
  <title>${status} ${statusText} - IPFS Service Worker Gateway</title>
  ${generateStyles()}
</head>
<body>
  <div class="container">
    ${generateHeader(status, statusText, errorType)}
    <div class="content">
      ${generateCIDSection(cid)}
      ${generateErrorSection(errorMessage)}
      ${generateSuggestionsSection(suggestions)}
      ${generateActionsSection(cid)}
      ${generateTechnicalDetails(config, stack)}
    </div>
  </div>
</body>
</html>`
}

/**
 * Generate CSS styles for error page
 */
function generateStyles(): string {
  return `<style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f7fa;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-bottom: 4px solid #f56565;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .header .error-type {
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      font-size: 18px;
      color: #2d3748;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-box {
      background: #f7fafc;
      border-left: 4px solid #4299e1;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    .error-box {
      background: #fff5f5;
      border-left: 4px solid #f56565;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    .warning-box {
      background: #fffaf0;
      border-left: 4px solid #ed8936;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    code {
      background: #edf2f7;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      word-break: break-all;
      color: #2d3748;
    }
    .cid-display {
      background: #edf2f7;
      padding: 12px;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      word-break: break-all;
      margin: 10px 0;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    li {
      margin: 8px 0;
      color: #4a5568;
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    button, .button {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary {
      background: #4299e1;
      color: white;
    }
    .btn-primary:hover {
      background: #3182ce;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
    }
    .btn-secondary {
      background: #e2e8f0;
      color: #2d3748;
    }
    .btn-secondary:hover {
      background: #cbd5e0;
    }
    .technical-details {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .technical-details summary {
      cursor: pointer;
      color: #4a5568;
      font-weight: 600;
      padding: 10px;
      background: #f7fafc;
      border-radius: 4px;
      user-select: none;
    }
    .technical-details summary:hover {
      background: #edf2f7;
    }
    .technical-details pre {
      background: #2d3748;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      margin-top: 10px;
      line-height: 1.5;
    }
  </style>`
}

/**
 * Generate header section with status and error type
 */
function generateHeader(status: number, statusText: string, errorType: string): string {
  return `<div class="header">
    <h1>${status} ${statusText}</h1>
    <div class="error-type">${errorType}</div>
  </div>`
}

/**
 * Generate CID information section (if CID is present)
 */
function generateCIDSection(cid: string | null): string {
  if (!cid) {
    return ''
  }

  return `<div class="section">
    <h2>🔗 Requested Content</h2>
    <div class="info-box">
      <p><strong>CID:</strong></p>
      <div class="cid-display">${escapeHtml(cid)}</div>
    </div>
  </div>`
}

/**
 * Generate error explanation section
 */
function generateErrorSection(errorMessage: string): string {
  return `<div class="section">
    <h2>⚠️ What Went Wrong</h2>
    <div class="error-box">
      <p>${escapeHtml(errorMessage)}</p>
    </div>
  </div>`
}

/**
 * Generate suggestions section with actionable items
 */
function generateSuggestionsSection(suggestions: string[]): string {
  if (!suggestions || suggestions.length === 0) {
    return ''
  }

  const suggestionsList = suggestions
    .map(s => `<li>${escapeHtml(s)}</li>`)
    .join('')

  return `<div class="section">
    <h2>💡 Possible Solutions</h2>
    <div class="warning-box">
      <ul>${suggestionsList}</ul>
    </div>
  </div>`
}

/**
 * Generate action buttons section
 */
function generateActionsSection(cid: string | null): string {
  const publicGatewayButton = cid
    ? `<a href="https://ipfs.io/ipfs/${escapeHtml(cid)}" target="_blank" rel="noopener noreferrer" class="button btn-secondary">
         🌐 Try Public Gateway
       </a>`
    : ''

  return `<div class="actions">
    <button class="btn-primary" onclick="location.reload()">
      🔄 Retry
    </button>
    <button class="btn-secondary" onclick="location.href='/'">
      🏠 Go Home
    </button>
    ${publicGatewayButton}
  </div>`
}

/**
 * Generate technical details section (collapsible)
 */
function generateTechnicalDetails(config: ErrorPageConfig, stack?: string): string {
  const technicalInfo = {
    status: config.status,
    statusText: config.statusText,
    errorType: config.errorType,
    url: config.url,
    cid: config.cid,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  }

  const jsonString = JSON.stringify(technicalInfo, null, 2)
  const stackTrace = stack ? `\n\nStack Trace:\n${stack}` : ''

  return `<details class="technical-details">
    <summary>🔧 Technical Details (for debugging)</summary>
    <pre>${escapeHtml(jsonString + stackTrace)}</pre>
  </details>`
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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
export function generateErrorPageFromInfo(
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
function getStatusText(status: number): string {
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