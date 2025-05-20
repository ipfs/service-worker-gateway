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
const referrerDetails = {}

// Initialize request counters
let totalRequests = 0
const userAgentRequests = {}
const contentTypeRequests = {}
const xRequestedWithRequests = {}

// Initialize counters for hotlinked image traffic
let hotlinkedImageBandwidth = 0
let hotlinkedImageRequests = 0

// Function to check if a user agent is browser-like
function isBrowserLike (userAgent) {
  /* Why "Mozilla/"?: The practice started with Netscape Navigator, which used
   * "Mozilla" in its user agent string. When other browsers like Internet
   * Explorer, Chrome, Firefox, and Safari emerged, they included "Mozilla" to
   * ensure compatibility with websites that checked for Netscape-like
   * browsers. This became a convention.
   */
  return userAgent.startsWith('Mozilla')
}

// TODO: how is Apache-HttpClient different from curl or Go-http-client ? should they be in the same coholt
// TODO: ignore uptime-kuma, or move to metadata / probes
function shouldSwitchToVerifiedFetch (userAgent) {
  if (['node', 'got', 'Next.js Middleware', 'undici', 'gentleman', 'vercel-image-optimization', 'context api', 'probe-image-size', 'Apache-HttpClient', 'Gateway', 'ReactorNetty', 'Typhoeus', 'StarkscanIndexer', 'Uptime-Kuma'].some(pattern => userAgent.startsWith(pattern))) {
    // exact matches
    return true
  }
  // case sensitive
  return ['Bun/', 'node-fetch/'].some(pattern => userAgent.includes(pattern))
}

// TODO: move VLC to streaming
// TODO: move twitterbot to metadata / crawlers
function knownCliUserAgents (userAgent) {
  return [
    'Java',
    'node',
    'Python',
    'python',
    'go-resty',
    'Go-http-client',
    'KlHttpClientCurl',
    'Wget',
    'wget',
    'curl',
    'VLC', // classify as known bandwidth
    'KlHttpClientPpl',
    'Dart',
    'T3ImageUploader',
    'Twitterbot'
  ].some(pattern => userAgent.startsWith(pattern)) || ['Lavf'].some(pattern => userAgent.includes(pattern))
}

// TODO: split/move streaming / tv / wallets
function knownMobileActors (userAgent) {
  const includes = ['Dalvik', 'BingTVStreams', 'Mobile', 'CFNetwork', 'Patch%20Updater', 'apsd', 'NotificationServiceExtension', 'SmartApp2', 'WININET', 'UnityPlayer', 'SkyGlass', 'MEXC', 'Coinbase%20Wallet'].some(pattern => userAgent.includes(pattern))
  const startsWith = [].some(pattern => userAgent.startsWith(pattern))

  const caseInsensitiveIncludes = ['android', 'iphone'].some(pattern => userAgent.toLowerCase().includes(pattern.toLowerCase()))

  return includes || startsWith || caseInsensitiveIncludes
}

// TODO: separate streaming / tv from things like openseametadatafetcher
function knownBadActors (userAgent) {
  // mozlila is a scanner
  return ['com.nst.iptvsmarterstvbox', 'mozlila', 'tivimate', 'nextv', 'stream4less', 'streams4less', 'flextv', 'openseametadatafetcher', 'com.ibopro.player', 'Enigma2 HbbTV', 'P3TV', 'SimplyTheBest.tv', 'StreamCreed', '9XtreamP', 'TVGAWD', 'kytv-agent', 'ExoPlayer', 'Exo Player', 'ORPlayer', 'SKREBRANDZ XC', 'LionsDenSports', 'MadCapMedia_XC', 'SmartersPro', 'com.ibopro.ultra', 'OTT Player', 'SkyXc', 'iMPlayer', 'AceFinal', 'Smarters', 'MaxiwebTV'].some(pattern => userAgent.toLowerCase().includes(pattern.toLowerCase()))
}

// TODO: include paths ending with proxy.js and proxy-ssl.js
// as not every client is windows service
function isCensorshipAvoidance (userAgent) {
  return ['WinHttp-Autoproxy-Service'].some(pattern => userAgent.startsWith(pattern))
}

function isWalletClient (userAgent) {
  const caseSensitiveIncludes = ['Coinbase%20Wallet'].some(pattern => userAgent.includes(pattern))
  const caseInsensitiveIncludes = ['wallet'].some(pattern => userAgent.toLowerCase().includes(pattern.toLowerCase()))

  return caseSensitiveIncludes || caseInsensitiveIncludes
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
      // calculate the number of requests and bandwidth for each referrer
      try {
        const referrerUrl = new URL(request.ClientRequestReferer)
        const referrer = referrerUrl.host.split('.').slice(-2).join('.')

        if (!referrerDetails[referrer]) {
          referrerDetails[referrer] = { bandwidth: 0, requests: 0 }
        }
        referrerDetails[referrer].bandwidth += bandwidth
        referrerDetails[referrer].requests += cnt

        // Check if the content type is an image for hotlink calculation
        const responseContentType = request.EdgeResponseContentType ? request.EdgeResponseContentType.toLowerCase().split(';')[0].trim() : ''
        if (['image', 'video', 'audio'].some(pattern => responseContentType.toLowerCase().startsWith(pattern.toLowerCase()))) {
          // NOTE: without the accept header details, these numbers are likely to be inaccurately high.
          hotlinkedImageBandwidth += bandwidth
          hotlinkedImageRequests += cnt
        }
      } catch {
        // ignore
      }
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
  let potentialWalletClientBandwidth = 0
  // Initialize categorized request counters
  let potentialVerifiedFetchRequests = 0
  let potentialMobileRequests = 0
  let potentialBadRequests = 0
  let potentialCliUserRequests = 0
  let potentialCensorshipAvoidanceRequests = 0
  let potentialWalletClientRequests = 0
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
    if (isWalletClient(userAgent)) {
      potentialWalletClientBandwidth += bandwidth
      potentialWalletClientRequests += requests
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
  console.log(`wallet clients: ${prettyBytes(potentialWalletClientBandwidth)} ${calculateAndFormatCosts(potentialWalletClientBandwidth, potentialWalletClientRequests)}`)
  console.log(`Total: ${prettyBytes(directFetchingTotalBandwidth)} ${calculateAndFormatCosts(directFetchingTotalBandwidth, directFetchingTotalRequests)}`)

  console.log()
  console.log('Other interesting stats:')
  console.log(`Hotlinked Image Traffic Estimate (Browser-like, Valid Referrer + image/video/audio): ${prettyBytes(hotlinkedImageBandwidth)} ${calculateAndFormatCosts(hotlinkedImageBandwidth, hotlinkedImageRequests)}`)

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

  console.log()
  console.log(`Referrer details (Top 20 of ${Object.keys(referrerDetails).length}):`)
  const sortedReferrerDetails = Object.entries(referrerDetails)
    .sort(([, a], [, b]) => b.bandwidth - a.bandwidth)

  for (const [referrer, data] of sortedReferrerDetails.slice(0, 20)) {
    console.log(`${referrer}: ${prettyBytes(data.bandwidth)} ${calculateAndFormatCosts(data.bandwidth, data.requests)}`)
  }
})
