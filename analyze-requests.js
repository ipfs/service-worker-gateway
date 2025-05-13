/* eslint-disable no-console */
import fs from 'node:fs'
import readline from 'node:readline'
import prettyBytes from 'pretty-bytes'

// Initialize a map to store bandwidth per user agent
const userAgentBandwidth = {}
let totalBandwidth = 0
const contentTypeBandwidth = {}

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

function knownMobileActors (userAgent) {
  if (userAgent === 'Dalvik') {
    return true
  }

  return ['Dalvik', 'BingTVStreams', 'Mobile'].some(pattern => userAgent.includes(pattern))
}

function knownBadActors (userAgent) {
  // mozlila is a scanner
  return ['mozlila', 'tivimate', 'nextv', 'stream4less', 'streams4less', 'flextv', 'openseametadatafetcher', 'com.ibopro.player', 'Enigma2 HbbTV', 'P3TV', 'SimplyTheBest.tv', 'StreamCreed', '9XtreamP', 'TVGAWD'].some(pattern => userAgent.toLowerCase().includes(pattern.toLowerCase()))
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
    if (isBrowserLike(userAgent)) {
      userAgent = 'browser'
    } else if (userAgent === '' || userAgent === null) {
      userAgent = 'unknown'
    }
    if (!userAgentBandwidth[userAgent]) {
      userAgentBandwidth[userAgent] = 0
    }
    userAgentBandwidth[userAgent] += bandwidth
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
    console.log(`${userAgent}: ${prettyBytes(bandwidth)}`)
  }
  console.log(`Total bandwidth used: ${prettyBytes(totalBandwidth)}`)
  console.log(`Bandwidth used by browser-like user agents: ${prettyBytes(userAgentBandwidth.browser)}`)
  console.log(`Potential verified fetch bandwidth: ${prettyBytes(potentialVerifiedFetchBandwidth)}`)
  console.log(`mobile bandwidth: ${prettyBytes(potentialMobileBandwidth)}`)
  console.log(`bad actor bandwidth: ${prettyBytes(potentialBadBandwidth)}`)

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
