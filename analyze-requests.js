/* eslint-disable no-console */
import fs from 'node:fs'
import readline from 'node:readline'
import prettyBytes from 'pretty-bytes'

// Cost constants
const TB_IN_BYTES_FOR_COSTING = 10 ** 12 // 1 Terabyte = 1,000,000,000,000 bytes
const BANDWIDTH_COST_PER_TB = 16.23
const REQUEST_COST_PER_MILLION = 0.23

// Function to calculate and format costs
function calculateAndFormatCosts (bandwidthInBytes, requestCount) {
  if (requestCount === undefined || requestCount === null) requestCount = 0 // Default to 0 if undefined
  const bandwidthCost = (bandwidthInBytes / TB_IN_BYTES_FOR_COSTING) * BANDWIDTH_COST_PER_TB
  const requestCost = (requestCount / 1000000) * REQUEST_COST_PER_MILLION
  // eslint-disable-next-line no-unused-vars
  const totalCost = bandwidthCost + requestCost
  // return `(BW Cost: $${bandwidthCost.toFixed(2)}, Req Cost: $${requestCost.toFixed(2)}, Total: $${totalCost.toFixed(2)})`
  // for now, just output the number of requests and exclude the costs
  return `(Req: ${requestCount})`
}

// Initialize a map to store bandwidth per user agent
/**
 * [String] -> number
 */
const userAgentBandwidth = {}
let totalBandwidth = 0
const contentTypeBandwidth = {}
const xRequestedWithBandwidth = {}

// Initialize request counters
let totalRequests = 0
const userAgentRequests = {}
const contentTypeRequests = {}
const xRequestedWithRequests = {}

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
    totalRequests += cnt

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
      userAgentRequests[userAgent] = 0
    }
    userAgentBandwidth[userAgent] += bandwidth
    userAgentRequests[userAgent] += cnt

    if (!xRequestedWithBandwidth[xRequestedWith]) {
      xRequestedWithBandwidth[xRequestedWith] = 0
      xRequestedWithRequests[xRequestedWith] = 0
    }
    // don't double up on mobile actors because they're already counted in the user agent bandwidth
    if (!knownMobileActors(userAgent) && xRequestedWith != null && xRequestedWith !== '') {
      xRequestedWithBandwidth[xRequestedWith] += bandwidth
      xRequestedWithRequests[xRequestedWith] += cnt
    }
    const contentType = request.EdgeResponseContentType == null || request.EdgeResponseContentType === '' ? 'unknown' : request.EdgeResponseContentType
    if (!contentTypeBandwidth[contentType]) {
      contentTypeBandwidth[contentType] = 0
      contentTypeRequests[contentType] = 0
    }
    contentTypeBandwidth[contentType] += bandwidth
    contentTypeRequests[contentType] += cnt
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

  // Initialize categorized request counters
  let potentialVerifiedFetchRequests = 0
  let potentialMobileRequests = 0
  let potentialBadRequests = 0
  let potentialCliUserRequests = 0
  let potentialCensorshipAvoidanceRequests = 0

  // For unclassified user agents
  const unclassifiedUserAgentsData = {}
  let totalUnclassifiedBandwidth = 0
  let totalUnclassifiedRequests = 0

  for (const [userAgent, bandwidth] of sortedEntries) {
    const requests = userAgentRequests[userAgent] || 0
    let isClassified = false

    if (userAgent === 'browser' || userAgent === 'unknown') {
      isClassified = true
    }

    if (shouldSwitchToVerifiedFetch(userAgent)) {
      potentialVerifiedFetchBandwidth += bandwidth
      potentialVerifiedFetchRequests += requests
      isClassified = true
    }
    if (knownMobileActors(userAgent)) {
      potentialMobileBandwidth += bandwidth
      potentialMobileRequests += requests
      isClassified = true
    }
    if (knownBadActors(userAgent)) {
      potentialBadBandwidth += bandwidth
      potentialBadRequests += requests
      isClassified = true
    }
    if (knownCliUserAgents(userAgent)) {
      potentialCliUserBandwidth += bandwidth
      potentialCliUserRequests += requests
      isClassified = true
    }
    if (isCensorshipAvoidance(userAgent)) {
      potentialCensorshipAvoidanceBandwidth += bandwidth
      potentialCensorshipAvoidanceRequests += requests
      isClassified = true
    }

    if (!isClassified) {
      if (!unclassifiedUserAgentsData[userAgent]) {
        unclassifiedUserAgentsData[userAgent] = { bandwidth: 0, requests: 0 }
      }
      unclassifiedUserAgentsData[userAgent].bandwidth += bandwidth
      unclassifiedUserAgentsData[userAgent].requests += requests
      totalUnclassifiedBandwidth += bandwidth
      totalUnclassifiedRequests += requests
    }

    // console.log(`${userAgent}: ${prettyBytes(bandwidth)} ${calculateAndFormatCosts(bandwidth, requests)}`)
  }
  console.log('User Agents Requiring Review (Unclassified):')
  const sortedUnclassifiedAgents = Object.entries(unclassifiedUserAgentsData)
    .sort(([, a], [, b]) => b.bandwidth - a.bandwidth) // Sort by bandwidth descending

  for (const [ua, data] of sortedUnclassifiedAgents) {
    console.log(`${ua}: ${prettyBytes(data.bandwidth)} ${calculateAndFormatCosts(data.bandwidth, data.requests)}`)
  }
  console.log(`Total Unclassified: ${prettyBytes(totalUnclassifiedBandwidth)} ${calculateAndFormatCosts(totalUnclassifiedBandwidth, totalUnclassifiedRequests)}`)

  const totalXRequestedWithBandwidth = Object.values(xRequestedWithBandwidth).reduce((acc, bw) => acc + bw, 0)
  const totalXRequestedWithRequests = Object.values(xRequestedWithRequests).reduce((acc, req) => acc + req, 0)

  const browserBandwidth = userAgentBandwidth.browser || 0
  const browserRequests = userAgentRequests.browser || 0

  const mobileCombinedBandwidth = potentialMobileBandwidth + totalXRequestedWithBandwidth
  const mobileCombinedRequests = potentialMobileRequests + totalXRequestedWithRequests

  const directFetchingTotalBandwidth = browserBandwidth + mobileCombinedBandwidth + potentialCliUserBandwidth + potentialVerifiedFetchBandwidth + potentialCensorshipAvoidanceBandwidth
  const directFetchingTotalRequests = browserRequests + mobileCombinedRequests + potentialCliUserRequests + potentialVerifiedFetchRequests + potentialCensorshipAvoidanceRequests

  console.log(`Total bandwidth used: ${prettyBytes(totalBandwidth)} ${calculateAndFormatCosts(totalBandwidth, totalRequests)}`)
  console.log()
  console.log('Bandwidth that can be migrated to direct fetching:')
  console.log(`browser-like user agents: ${prettyBytes(browserBandwidth)} ${calculateAndFormatCosts(browserBandwidth, browserRequests)}`)
  console.log(`mobile usage: ${prettyBytes(mobileCombinedBandwidth)} ${calculateAndFormatCosts(mobileCombinedBandwidth, mobileCombinedRequests)}`)
  console.log(`should be running their own IPFS nodes: ${prettyBytes(potentialCliUserBandwidth)} ${calculateAndFormatCosts(potentialCliUserBandwidth, potentialCliUserRequests)}`)
  console.log(`can run verified fetch instead: ${prettyBytes(potentialVerifiedFetchBandwidth)} ${calculateAndFormatCosts(potentialVerifiedFetchBandwidth, potentialVerifiedFetchRequests)}`)
  console.log(`censorship avoidance (good thing): ${prettyBytes(potentialCensorshipAvoidanceBandwidth)} ${calculateAndFormatCosts(potentialCensorshipAvoidanceBandwidth, potentialCensorshipAvoidanceRequests)}`)
  console.log(`Total: ${prettyBytes(directFetchingTotalBandwidth)} ${calculateAndFormatCosts(directFetchingTotalBandwidth, directFetchingTotalRequests)}`)

  console.log()
  console.log('Bandwidth that we will be happy to lose:')
  console.log(`bad actor bandwidth: ${prettyBytes(potentialBadBandwidth)} ${calculateAndFormatCosts(potentialBadBandwidth, potentialBadRequests)}`)
  console.log(`total: ${prettyBytes(potentialBadBandwidth)} ${calculateAndFormatCosts(potentialBadBandwidth, potentialBadRequests)}`)

  console.log()
  console.log('--------------------------------')
  console.log()
  console.log('Content type bandwidth:')
  const sortedContentTypes = Object.entries(contentTypeBandwidth)
    .sort(([, a], [, b]) => a - b)

  for (const [contentType, bandwidth] of sortedContentTypes) {
    const requests = contentTypeRequests[contentType] || 0
    console.log(`${contentType}: ${prettyBytes(bandwidth)} ${calculateAndFormatCosts(bandwidth, requests)}`)
  }
})
