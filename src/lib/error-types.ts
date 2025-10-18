/**
 * Error type detection and categorization for IPFS Service Worker Gateway
 * 
 * This module analyzes errors and provides user-friendly explanations with
 * actionable suggestions for resolution.
 * 
 * @module error-types
 */

/**
 * Structured error information with user-facing details
 */
export interface ErrorInfo {
  /** Machine-readable error category */
  errorType: ErrorType
  /** User-friendly error explanation */
  errorMessage: string
  /** Actionable suggestions to resolve the issue */
  suggestions: string[]
  /** HTTP status code to return */
  statusCode: number
}

/**
 * Supported error categories
 */
export enum ErrorType {
  HASH_VERIFICATION_FAILED = 'Hash Verification Failed',
  NO_PROVIDERS = 'No Providers Found',
  TIMEOUT = 'Request Timeout',
  NETWORK_ERROR = 'Network Error',
  INVALID_CID = 'Invalid CID',
  UNSUPPORTED_FORMAT = 'Unsupported Content Type',
  UNKNOWN = 'Unknown Error'
}

/**
 * Analyze an error and return categorized information
 * 
 * @param error - Error object or error message string
 * @returns Structured error information with suggestions
 * 
 */
export function detectErrorType(error: Error | string): ErrorInfo {
  const errorMsg = typeof error === 'string' ? error : error.message
  const errorMsgLower = errorMsg.toLowerCase()

  // Hash verification error - critical data integrity issue
  if (errorMsgLower.includes('hash') && (errorMsgLower.includes('match') || errorMsgLower.includes('verif'))) {
    return {
      errorType: ErrorType.HASH_VERIFICATION_FAILED,
      errorMessage: 'The downloaded block\'s hash did not match the requested CID. This indicates data corruption or a security issue.',
      suggestions: [
        'The content may have been corrupted during transmission',
        'Try accessing the content from a different IPFS gateway',
        'Clear your browser cache and retry',
        'If you control this content, verify its integrity and re-pin to IPFS'
      ],
      statusCode: 502 // Bad Gateway - upstream returned invalid data
    }
  }

  // No providers error - content unavailable on network
  if (errorMsgLower.includes('no provider') || errorMsgLower.includes('no peers') || errorMsgLower.includes('could not find')) {
    return {
      errorType: ErrorType.NO_PROVIDERS,
      errorMessage: 'No nodes on the IPFS network are currently hosting this content.',
      suggestions: [
        'The content may have been unpinned from all hosting nodes',
        'Wait a few minutes and try again as nodes may come online',
        'Verify the CID is correct and the content was properly published',
        'Check if the content is available on public gateways like ipfs.io'
      ],
      statusCode: 404 // Not Found - content doesn't exist on network
    }
  }

  // Timeout error - slow retrieval
  if (errorMsgLower.includes('timeout') || errorMsgLower.includes('aborted')) {
    return {
      errorType: ErrorType.TIMEOUT,
      errorMessage: 'The request took too long to complete and was aborted.',
      suggestions: [
        'The content may be hosted on slow or geographically distant nodes',
        'Try again in a few moments',
        'Check your internet connection',
        'Try accessing via a public IPFS gateway',
        'Consider increasing the timeout in the config page'
      ],
      statusCode: 504 // Gateway Timeout
    }
  }

  // Network error - connectivity issues
  if (errorMsgLower.includes('network') || errorMsgLower.includes('fetch failed') || errorMsgLower.includes('connection')) {
    return {
      errorType: ErrorType.NETWORK_ERROR,
      errorMessage: 'A network error occurred while fetching the content.',
      suggestions: [
        'Check your internet connection',
        'Try refreshing the page',
        'The IPFS network may be experiencing temporary issues',
        'Try again in a few moments'
      ],
      statusCode: 503 // Service Unavailable
    }
  }

  // Invalid CID - malformed identifier
  if (errorMsgLower.includes('invalid') && errorMsgLower.includes('cid')) {
    return {
      errorType: ErrorType.INVALID_CID,
      errorMessage: 'The provided CID is not valid or properly formatted.',
      suggestions: [
        'Verify the CID is correctly formatted (starts with "bafy" or "Qm")',
        'Ensure you copied the complete CID without truncation',
        'Try accessing different content to verify the gateway is working',
        'Learn about CID formats at https://cid.ipfs.tech'
      ],
      statusCode: 400 // Bad Request
    }
  }

  // Unsupported format
  if (errorMsgLower.includes('unsupported') || errorMsgLower.includes('codec')) {
    return {
      errorType: ErrorType.UNSUPPORTED_FORMAT,
      errorMessage: 'The content uses a format or codec not supported by this gateway.',
      suggestions: [
        'The content may use newer IPFS features not yet supported',
        'Try accessing it from a different IPFS implementation',
        'Check the IPFS documentation for supported content types'
      ],
      statusCode: 415 // Unsupported Media Type
    }
  }

  // Default/unknown error
  return {
    errorType: ErrorType.UNKNOWN,
    errorMessage: errorMsg,
    suggestions: [
      'Try refreshing the page',
      'Check the browser console for technical details',
      'Try accessing the content from a public IPFS gateway',
      'Report this issue at https://github.com/ipfs/service-worker-gateway/issues'
    ],
    statusCode: 500 // Internal Server Error
  }
}

/**
 * Extract CID from URL in subdomain or path format
 * 
 * @param url - URL object to parse
 * @returns Extracted CID or null if not found
 * 
 */
export function extractCIDFromURL(url: URL): string | null {
  // Subdomain format: <cid>.ipfs.domain.com or <cid>.ipns.domain.com
  const subdomainMatch = url.hostname.match(/^(.+?)\.(ipfs|ipns)\./)
  if (subdomainMatch) {
    return subdomainMatch[1]
  }

  // Path format: /ipfs/<cid> or /ipns/<cid>
  const pathMatch = url.pathname.match(/^\/(ipfs|ipns)\/([^/?#]+)/)
  if (pathMatch) {
    return pathMatch[2]
  }

  return null
}