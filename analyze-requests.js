/* eslint-disable no-console */
import fs from 'node:fs'
import readline from 'node:readline'
import prettyBytes from 'pretty-bytes'

// Initialize a map to store bandwidth per user agent
/**
 * [String] -> number
 */
const userAgentBandwidth = {}
let totalBandwidth = 0
const contentTypeBandwidth = {}
const xRequestedWithBandwidth = {}

// Define a list of substrings that identify browser-like user agents
const browserLikePatterns = ['mozilla', 'chrome', 'safari', 'firefox', 'edge', 'opera']

// Function to check if a user agent is browser-like
function isBrowserLike (userAgent) {
  return browserLikePatterns.some(pattern => userAgent.toLowerCase().includes(pattern))
}

function shouldSwitchToVerifiedFetch (userAgent) {
  if (['node', 'got (https://github.com/sindresorhus/got)', 'Next.js Middleware', 'undici'].includes(userAgent)) {
    // exact matches
    return true
  }
  // case sensitive
  return ['Bun/', 'node-fetch/'].some(pattern => userAgent.includes(pattern))
}

function knownCliUserAgents (userAgent) {
  return ['Java', 'node', 'Python', 'python', 'go-resty', 'Go-http-client', 'KlHttpClientCurl', 'Wget', 'wget', 'curl'].some(pattern => userAgent.startsWith(pattern))
}

function knownMobileActors (userAgent) {
  return ['Dalvik', 'BingTVStreams', 'Mobile'].some(pattern => userAgent.includes(pattern))
}

function knownBadActors (userAgent) {
  // mozlila is a scanner
  return ['mozlila', 'tivimate', 'nextv', 'stream4less', 'streams4less', 'flextv', 'openseametadatafetcher', 'com.ibopro.player', 'Enigma2 HbbTV', 'P3TV', 'SimplyTheBest.tv', 'StreamCreed', '9XtreamP', 'TVGAWD'].some(pattern => userAgent.toLowerCase().includes(pattern.toLowerCase()))
}

function isCensorshipAvoidance (userAgent) {
  return ['WinHttp-Autoproxy-Service'].some(pattern => userAgent.startsWith(pattern))
}

// Read the file line by line
const fileStream = fs.createReadStream(process.argv[2])
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
})

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line)
    const cnt = parseInt(request.cnt, 10)
    const bytes = parseInt(request.EdgeResponseBytes, 10)

    // Calculate bandwidth for the current line
    const bandwidth = cnt * bytes
    totalBandwidth += bandwidth

    // Track bandwidth by user agent
    let userAgent = request.ClientRequestUserAgent.split('/')[0]
    const xRequestedWith = request.ClientXRequestedWith
    if (isBrowserLike(userAgent)) {
      userAgent = 'browser'
    } else if (userAgent === '' || userAgent === null) {
      userAgent = 'unknown'
    }
    if (!userAgentBandwidth[userAgent]) {
      userAgentBandwidth[userAgent] = 0
    }
    userAgentBandwidth[userAgent] += bandwidth
    if (!xRequestedWithBandwidth[xRequestedWith]) {
      xRequestedWithBandwidth[xRequestedWith] = 0
    }
    // don't double up on mobile actors because they're already counted in the user agent bandwidth
    if (!knownMobileActors(userAgent) && xRequestedWith != null && xRequestedWith !== '') {
      xRequestedWithBandwidth[xRequestedWith] += bandwidth
    }
    const contentType = request.EdgeResponseContentType == null || request.EdgeResponseContentType === '' ? 'unknown' : request.EdgeResponseContentType
    if (!contentTypeBandwidth[contentType]) {
      contentTypeBandwidth[contentType] = 0
    }
    contentTypeBandwidth[contentType] += bandwidth
  } catch (err) {
    console.error(`Error parsing line: ${err}`)
  }
})

rl.on('close', () => {
  console.log('Bandwidth per user agent:')
  // Convert to array and sort by bandwidth
  const sortedEntries = Object.entries(userAgentBandwidth)
    .sort(([, a], [, b]) => a - b)

  let potentialVerifiedFetchBandwidth = 0
  let potentialMobileBandwidth = 0
  let potentialBadBandwidth = 0
  let potentialCliUserBandwidth = 0
  let potentialCensorshipAvoidanceBandwidth = 0
  for (const [userAgent, bandwidth] of sortedEntries) {
    if (shouldSwitchToVerifiedFetch(userAgent)) {
      potentialVerifiedFetchBandwidth += bandwidth
    }
    if (knownMobileActors(userAgent)) {
      potentialMobileBandwidth += bandwidth
    }
    if (knownBadActors(userAgent)) {
      potentialBadBandwidth += bandwidth
    }
    if (knownCliUserAgents(userAgent)) {
      potentialCliUserBandwidth += bandwidth
    }
    if (isCensorshipAvoidance(userAgent)) {
      potentialCensorshipAvoidanceBandwidth += bandwidth
    }
    console.log(`${userAgent}: ${prettyBytes(bandwidth)}`)
  }
  const totalXRequestedWithBandwidth = Object.values(xRequestedWithBandwidth).reduce((acc, bandwidth) => acc + bandwidth, 0)
  console.log(`Total bandwidth used: ${prettyBytes(totalBandwidth)}`)
  console.log()
  console.log('Bandwidth that can be migrated to direct fetching:')
  console.log(`browser-like user agents: ${prettyBytes(userAgentBandwidth.browser)}`)
  console.log(`mobile usage: ${prettyBytes(potentialMobileBandwidth + totalXRequestedWithBandwidth)}`)
  console.log(`should be running their own IPFS nodes: ${prettyBytes(potentialCliUserBandwidth)}`)
  console.log(`can run verified fetch instead: ${prettyBytes(potentialVerifiedFetchBandwidth)}`)
  console.log(`censorship avoidance (good thing): ${prettyBytes(potentialCensorshipAvoidanceBandwidth)}`)
  console.log(`Total: ${prettyBytes(userAgentBandwidth.browser + potentialMobileBandwidth + totalXRequestedWithBandwidth + potentialCliUserBandwidth + potentialVerifiedFetchBandwidth + potentialCensorshipAvoidanceBandwidth)}`)

  console.log()
  console.log('Bandwidth that we will be happy to lose:')
  console.log(`bad actor bandwidth: ${prettyBytes(potentialBadBandwidth)}`)
  console.log(`total: ${prettyBytes(potentialBadBandwidth)}`)

  console.log()
  console.log('--------------------------------')
  console.log()
  console.log('Content type bandwidth:')
  const sortedContentTypes = Object.entries(contentTypeBandwidth)
    .sort(([, a], [, b]) => a - b)

  for (const [contentType, bandwidth] of sortedContentTypes) {
    console.log(`${contentType}: ${prettyBytes(bandwidth)}`)
  }
})
