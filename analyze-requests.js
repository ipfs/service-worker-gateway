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

// Show % of totals
function prettyPercentUse (bandwidthInBytes, requestCount) {
  const bandwidthPercent = (bandwidthInBytes / totalBandwidth * 100).toFixed(2).toString()
  const requestPercent = (requestCount / totalRequests * 100).toFixed(2).toString()
  return `${prettyBytes(bandwidthInBytes).padStart(10)} (${bandwidthPercent.padStart(5)}%) / ${requestCount.toString().padStart(12)} req. (${requestPercent.padStart(5)}%)`
}

// Initialize counters for specific group

// A: browser hosting
let hostingBrowserBandwidth = 0
let hostingBrowserRequests = 0

// B: hotlinked browser (Mozilla/*)
let hotlinkedBrowserImagesBandwidth = 0
let hotlinkedBrowserImagesRequests = 0
let hotlinkedBrowserAudioVideoBandwidth = 0
let hotlinkedBrowserAudioVideoRequests = 0
let hotlinkedBrowserJSONBandwidth = 0
let hotlinkedBrowserJSONRequests = 0
let hotlinkedBrowserOtherBandwidth = 0
let hotlinkedBrowserOtherRequests = 0
let otherProxyPACBrowserBandwidth = 0
let otherProxyPACBrowserRequests = 0

// B: hotlinked apps (X-Requested-With + user agents with "wallet")
let hotlinkedAppImagesBandwidth = 0
let hotlinkedAppImagesRequests = 0
let hotlinkedAppAudioVideoBandwidth = 0
let hotlinkedAppAudioVideoRequests = 0
let hotlinkedAppJSONBandwidth = 0
let hotlinkedAppJSONRequests = 0
let hotlinkedAppOtherBandwidth = 0
let hotlinkedAppOtherRequests = 0

// C: other
let otherVideoBandwidth = 0
let otherVideoRequests = 0

let otherProxyPACWindowsBandwidth = 0
let otherProxyPACWindowsRequests = 0

let remainingImagesBandwidth = 0
let remainingImagesRequests = 0
let remainingAudioVideoBandwidth = 0
let remainingAudioVideoRequests = 0
let remainingJSONBandwidth = 0
let remainingJSONRequests = 0
let remainingOtherBandwidth = 0
let remainingOtherRequests = 0

let maxUserAgentLen = 0
let maxRefererLen = 0
let maxContentTypeLen = 0

// Function to check if a user agent is browser-like
// NOTE: we explicitly dont depend on Mozilla/ prefix, as everything pretends to be a browser these days
// Instead, we depend on most popular vendors (best-effort)
const browserLikePatterns = ['chrome', 'safari', 'firefox', 'edge', 'opera', 'samsungbrowser']
function isBrowserLike (fullUserAgentLowercase) {
  return browserLikePatterns.some(p => fullUserAgentLowercase.includes(p))
}

/*
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


function isCensorshipAvoidance (userAgent, path) {
  // https://antizapret.prostovpn.org/ uses ipfs.io for distributing proxy (PAC) manifests
  // (include paths ending with /proxy-nossl.js because not every client is windows service)
  const windowsClient = (userAgent ?? '').startsWith('WinHttp-Autoproxy-Service')

  // Optional path  - disclaimer:
  // If we dont pass path, we lose some users who set up proxy in different user agents,
  // such as browsers. Looking at cloudflare dashboard, in last 24h
  // requests to /proxy-nossl.js were ~781.85k and WinHttp-Autoproxy-Service was only ~510k of them.
  // which means user-agent alone is only ~65% of requests.
  const otherClients = (path ?? '').endsWith('/proxy-nossl.js')

  return windowsClient || otherClients
}

function isWalletClient (userAgent) {
  const caseSensitiveIncludes = ['Coinbase%20Wallet'].some(pattern => userAgent.includes(pattern))
  const caseInsensitiveIncludes = ['wallet'].some(pattern => userAgent.toLowerCase().includes(pattern.toLowerCase()))

  return caseSensitiveIncludes || caseInsensitiveIncludes
}
*/

// Browser hotlinking and web-like hotlinking (mobile apps and software written in node/js), that could use drop-in JS solution (verified-fetch).
// This is part of Group B because it is worth reaching out to related entities before we start throttling / returning errors.
function knownHotlinkingApp(fullUserAgentLowercase) {
  return ['wallet', 'electron','nft','metadata', 'got', 'undici', 'axios', 'vercel', 'node', 'android', 'iphone', 'dalvik', 'blockscout'].some(k => fullUserAgentLowercase.includes(k))
}

// Those are non-browser non-web clients that are effectively just using free CDN without benefiting from IPFS.
function knownVideoClients (userAgent) {
  return ['Stream', 'Player', 'VLC', 'com.nst.iptvsmarterstvbox', 'tivimate', 'nextv', 'stream4less', 'streams4less', 'flextv', 'com.ibopro.player', 'Enigma2 HbbTV', 'P3TV', 'SimplyTheBest.tv', '9XtreamP', 'TVGAWD', 'kytv-agent', 'TiviMate', 'ExoPlayer', 'Exo Player', 'ORPlayer', 'SKREBRANDZ XC', 'LionsDenSports', 'MadCapMedia_XC', 'SmartersPro', 'com.ibopro.ultra', 'OTT Player', 'SkyXc', 'iMPlayer', 'AceFinal', 'Smarters', 'MaxiwebTV', 'Lavf'].some(pattern => userAgent.toLowerCase().includes(pattern.toLowerCase()))
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
    const fullUserAgentLowercase = request.ClientRequestUserAgent.toLowerCase()
    let userAgent = request.ClientRequestUserAgent.split('/')[0].trim().slice(0, 29)
    const xRequestedWith = request.ClientXRequestedWith

    // Normalize all browsers into 'browser'
    if (isBrowserLike(fullUserAgentLowercase)) {
      userAgent = 'browser'
    } else if (userAgent === 'Mozilla') {
      userAgent = 'Mozilla (pretending)'
    } else if (userAgent === '' || userAgent === null) {
      userAgent = 'unknown'
    }

    if (userAgent.length > maxUserAgentLen) {
      maxUserAgentLen = userAgent.length
    }

    // calculate the number of requests and bandwidth for each referrer
    let referrer = ''
    try {
      if (['', '/', 'about:blank'].every(r => r != request.ClientRequestReferer)) {
        if (!request.ClientRequestReferer.startsWith('http')) {
          request.ClientRequestReferer = 'https://' + request.ClientRequestReferer
        }
        const referrerUrl = new URL(request.ClientRequestReferer)
        referrer = referrerUrl.host.split('.').slice(-2).join('.')

        if (!referrerDetails[referrer]) {
          referrerDetails[referrer] = { bandwidth: 0, requests: 0 }
          if (referrer.length > maxRefererLen) {
            maxRefererLen = referrer.length
          }
        }
        referrerDetails[referrer].bandwidth += bandwidth
        referrerDetails[referrer].requests += cnt
      }
    } catch (e) {
      console.error(`Error parsing line: ${e}`)
    }

    // extract high level content type
    const contentType = request.EdgeResponseContentType ? request.EdgeResponseContentType.toLowerCase().split(';')[0].trim().slice(0, 29) : 'unknown'

    // ensure we assign request to only one "special interest" group
    let match = false

    // C: measure use by https://antizapret.prostovpn.org/ which is a special case because it
    // is requested by different user agents, and not all of them can be migrated
    // This is matched before everything else as some of these are browsers that look like direct hosting,
    // and we do not want to false-positive match or double-count them
    if (!match && (request.ClientRequestURI.endsWith('/proxy-ssl.js') || request.ClientRequestURI.endsWith('/proxy-nossl.js'))) {
      if (userAgent === 'browser') {
        // these could, in theory,  be migrated to verified-fetch inside of a browser extension
        // like https://chrome.google.com/webstore/detail/%D0%BE%D0%B1%D1%85%D0%BE%D0%B4-%D0%B1%D0%BB%D0%BE%D0%BA%D0%B8%D1%80%D0%BE%D0%B2%D0%BE%D0%BA-%D1%80%D1%83%D0%BD%D0%B5%D1%82%D0%B0/npgcnondjocldhldegnakemclmfkngch
        otherProxyPACBrowserBandwidth += bandwidth
        otherProxyPACBrowserRequests += cnt
      } else if ((userAgent ?? '').startsWith('WinHttp-Autoproxy-Service')) {
        // This is Windows polling PAC update - we can't migrate this,
        // and if we start throttling, it will DoS us - ask lidel for details
        otherProxyPACWindowsBandwidth += bandwidth
        otherProxyPACWindowsRequests += cnt
      }
      match = true
    }


    // B: Hotlinking from Browsers
    // browser-based hotlinking from foreign referers per popular media types
    // (exclude ipfs.io as those will show up if subresource was loaded by a parent page loaded from gateway itself)
    // These are good candidates for switching to verified-fetch as well.
    if (!match && userAgent === 'browser' && referrer !== '' && ['ipfs.io', 'dweb.link'].every(r => !referrer.includes(r)) && xRequestedWith === '') {
      if (['image'].some(pattern => contentType.toLowerCase().includes(pattern.toLowerCase()))) {
        // image NFTs
        hotlinkedBrowserImagesBandwidth += bandwidth
        hotlinkedBrowserImagesRequests += cnt
      } else if (['video', 'audio'].some(pattern => contentType.toLowerCase().includes(pattern.toLowerCase()))) {
        hotlinkedBrowserAudioVideoBandwidth += bandwidth
        hotlinkedBrowserAudioVideoRequests += cnt
      } else if (['json'].some(pattern => contentType.toLowerCase().includes(pattern.toLowerCase()))) {
        hotlinkedBrowserJSONBandwidth += bandwidth
        hotlinkedBrowserJSONRequests += cnt
      } else {
        hotlinkedBrowserOtherBandwidth += bandwidth
        hotlinkedBrowserOtherRequests += cnt
      }
      match = true
    }

    // B: Hotlinking from apps
    // Best-effort detection of hotlinking from apps (user agents that include 'wallet', 'electron', fetch ntft metadata or have appid in X-Requested-With
    // These are good candidates for switching to verified-fetch as well.
    if (!match && userAgent !== 'browser' && knownHotlinkingApp(fullUserAgentLowercase) || xRequestedWith !== '') {
      if (['image'].some(pattern => contentType.toLowerCase().includes(pattern.toLowerCase()))) {
        // image NFTs
        hotlinkedAppImagesBandwidth += bandwidth
        hotlinkedAppImagesRequests += cnt
      } else if (['video', 'audio'].some(pattern => contentType.toLowerCase().includes(pattern.toLowerCase()))) {
        hotlinkedAppAudioVideoBandwidth += bandwidth
        hotlinkedAppAudioVideoRequests += cnt
      } else if (['json'].some(pattern => contentType.toLowerCase().includes(pattern.toLowerCase()))) {
        hotlinkedAppJSONBandwidth += bandwidth
        hotlinkedAppJSONRequests += cnt
      } else {
        hotlinkedAppOtherBandwidth += bandwidth
        hotlinkedAppOtherRequests += cnt
      }
      match = true
    }

    // Exclusive group for (A)
    if (!match && userAgent === 'browser' && ['', 'ipfs.io', 'dweb.link'].some(r => referrer.includes(r))  && xRequestedWith === '') {
      hostingBrowserBandwidth += bandwidth
      hostingBrowserRequests += cnt
      match = true
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

    if (!contentTypeBandwidth[contentType]) {
      contentTypeBandwidth[contentType] = 0
      contentTypeRequests[contentType] = 0
      if (contentType.length > maxContentTypeLen) {
        maxContentTypeLen = contentType.length
      }
    }
    contentTypeBandwidth[contentType] += bandwidth
    contentTypeRequests[contentType] += cnt

    // C: iptv and .ts streamers
    if (!match && userAgent !== 'browser' && (knownVideoClients(fullUserAgentLowercase) || contentType.startsWith('text/vnd.trolltech.linguist'))) {
      otherVideoBandwidth += bandwidth
      otherVideoRequests += cnt
      match = true
    }

    // C: everything else, at least classify by content type
    if (!match) {
      // Best-effort detection of hotlinking from apps (user agents that include 'wallet', 'electron', fetch ntft metadata or have appid in X-Requested-With
      // These are good candidates for switching to verified-fetch as well.
      if (['image'].some(pattern => contentType.toLowerCase().includes(pattern.toLowerCase()))) {
        // image NFTs
        remainingImagesBandwidth += bandwidth
        remainingImagesRequests += cnt
      } else if (['video', 'audio'].some(pattern => contentType.toLowerCase().includes(pattern.toLowerCase()))) {
        remainingAudioVideoBandwidth += bandwidth
        remainingAudioVideoRequests += cnt
      } else if (['json'].some(pattern => contentType.toLowerCase().includes(pattern.toLowerCase()))) {
        remainingJSONBandwidth += bandwidth
        remainingJSONRequests += cnt
      } else {
        remainingOtherBandwidth += bandwidth
        remainingOtherRequests += cnt
      }
      match = true
    }

  } catch (err) {
    console.error(`Error parsing line: ${err}`)
  }
})

rl.on('close', () => {

  const browserBandwidth = userAgentBandwidth.browser || 0
  const browserRequests = userAgentRequests.browser || 0

  const summaryLimit = 30

  console.log()
  console.log('═══════════════════════════════════════╡╞═══════════════════════════════════════')
  console.log()
  console.log(`Content Type - TOP ${summaryLimit} per Bandwidth (of ${Object.keys(contentTypeBandwidth).length}):`)
  console.log()
  const sortedContentTypes = Object.entries(contentTypeBandwidth)
    .sort(([, a], [, b]) => b - a)

  for (const [contentType, bandwidth] of sortedContentTypes.slice(0,summaryLimit)) {
    const requests = contentTypeRequests[contentType] || 0
    console.log(`${contentType.padStart(maxContentTypeLen)}  ${prettyPercentUse(bandwidth, requests)}`)
  }

  console.log()
  console.log(`Content Type - TOP ${summaryLimit} per Requests:`)
  console.log()
  const sortedContentTypesR = Object.entries(contentTypeRequests)
    .sort(([, a], [, b]) => b - a)

  for (const [contentType, requests] of sortedContentTypesR.slice(0,summaryLimit)) {
    const bandwidth = contentTypeBandwidth[contentType] || 0
    console.log(`${contentType.padStart(maxContentTypeLen)}  ${prettyPercentUse(bandwidth, requests)}`)
  }
  console.log()
  console.log('═══════════════════════════════════════╡╞═══════════════════════════════════════')
  console.log()

  console.log(`Referrer - TOP ${summaryLimit} per Bandwidth (of ${Object.keys(referrerDetails).length})):`)
  console.log()
  const sortedReferrerDetails = Object.entries(referrerDetails)
    .sort(([, a], [, b]) => b.bandwidth - a.bandwidth)

  for (const [referrer, data] of sortedReferrerDetails.slice(0, summaryLimit)) {
    console.log(`${referrer.padStart(maxRefererLen)}  ${prettyPercentUse(data.bandwidth, data.requests)}`)
  }

  console.log()
  console.log(`Referrer - TOP ${summaryLimit} per Requests:`)
  console.log()
  const sortedReferrerReqDetails = Object.entries(referrerDetails)
    .sort(([, a], [, b]) => b.requests - a.requests)

  for (const [referrer, data] of sortedReferrerReqDetails.slice(0, summaryLimit)) {
    console.log(`${referrer.padStart(maxRefererLen)}  ${prettyPercentUse(data.bandwidth, data.requests)}`)
  }

  console.log()
  console.log('═══════════════════════════════════════╡╞═══════════════════════════════════════')
  console.log()
  console.log(`User agent - TOP ${summaryLimit} per Bandwidth (of ${Object.keys(userAgentBandwidth).length}):`)
  console.log()
  // Convert to array and sort by bandwidth
  const sortedUserAgentBandwidth = Object.entries(userAgentBandwidth)
    .sort(([, a], [, b]) => b - a)
  for (const [userAgent, bandwidth] of sortedUserAgentBandwidth.slice(0,summaryLimit)) {
    const requests = userAgentRequests[userAgent] || 0
    console.log(`${userAgent.padStart(maxUserAgentLen)}  ${prettyPercentUse(bandwidth, requests)}`)
  }

  console.log()
  console.log(`User agent - TOP ${summaryLimit} per Requests:`)
  console.log()
  // Convert to array and sort by bandwidth
  const sortedUserAgentRequests = Object.entries(userAgentRequests)
    .sort(([, a], [, b]) => b - a )
  for (const [userAgent, requests] of sortedUserAgentRequests.slice(0,summaryLimit)) {
    const bandwidth = userAgentBandwidth[userAgent] || 0
    console.log(`${userAgent.padStart(maxUserAgentLen)}  ${prettyPercentUse(bandwidth, requests)}`)
  }

  console.log()
  console.log('═══════════════════════════════════════╡╞═══════════════════════════════════════')
  console.log(`Total traffic:        ${prettyPercentUse(totalBandwidth, totalRequests)}`)
  console.log(`Looks-like-a-Browser: ${prettyPercentUse(browserBandwidth, browserRequests)}`)
  console.log('═══════════════════════════════════════╡╞═══════════════════════════════════════')
  console.log()

  // Matching groups from https://www.notion.so/blogpost-Gateway-Evolution-Transitioning-Users-to-Direct-Retrieval-with-IPFS-1fc1def3428780dab469d42c433e0053?source=copy_link#1fc1def3428780bca79ac3b5f7cca8e5
  console.log('Traffic per special-interest group from report:')
  console.log()

  // A: "real web hosting" is browser-like traffic where resource was requested by the browser directly,
  // or fromreferer that was also a website loaded from gateway (minus things we identified as cross-origin hotlinking behavior)
  let aTotalBandwidth = hostingBrowserBandwidth
  let aTotalRequests = hostingBrowserRequests
  console.log(` A: Browsers  (only web hosting): ${prettyPercentUse(hostingBrowserBandwidth, hostingBrowserRequests)}`)
  console.log()

  // B: are "hotlinking" types that are either browsers (websites hotlinking cross-origin) or mobile/desktop/node apps built with electron or other web-like runtimes
  // which makes them good candicates for drop-in switch to service worker or verified-fetch
  // it also is a group to which we will reach out
  let bTotalBandwidth = hotlinkedBrowserImagesBandwidth + hotlinkedBrowserAudioVideoBandwidth + hotlinkedBrowserJSONBandwidth + hotlinkedBrowserOtherBandwidth +
                        otherProxyPACBrowserBandwidth +
                        hotlinkedAppImagesBandwidth + hotlinkedAppAudioVideoBandwidth + hotlinkedAppJSONBandwidth + hotlinkedAppOtherBandwidth
  let bTotalRequests = hotlinkedBrowserImagesRequests + hotlinkedBrowserAudioVideoRequests + hotlinkedBrowserJSONRequests + hotlinkedBrowserOtherRequests
                       otherProxyPACBrowserRequests +
                       hotlinkedAppImagesRequests + hotlinkedAppAudioVideoRequests + hotlinkedAppJSONRequests + hotlinkedAppOtherRequests
  console.log(` B: Hotlinking Total:             ${prettyPercentUse(bTotalBandwidth, bTotalRequests)}`)
  console.log(`               Browsers (images): ${prettyPercentUse(hotlinkedBrowserImagesBandwidth, hotlinkedBrowserImagesRequests)}`)
  console.log(`               Browsers  (media): ${prettyPercentUse(hotlinkedBrowserAudioVideoBandwidth, hotlinkedBrowserAudioVideoRequests)}`)
  console.log(`               Browsers   (json): ${prettyPercentUse(hotlinkedBrowserJSONBandwidth, hotlinkedBrowserJSONRequests)}`)
  console.log(`               Browsers  (other): ${prettyPercentUse(hotlinkedBrowserOtherBandwidth, hotlinkedBrowserOtherRequests)}`)
  console.log(`               Browsers  (proxy): ${prettyPercentUse(otherProxyPACBrowserBandwidth, otherProxyPACBrowserRequests)}`)
  console.log(`               Apps     (images): ${prettyPercentUse(hotlinkedAppImagesBandwidth, hotlinkedAppImagesRequests)}`)
  console.log(`               Apps      (media): ${prettyPercentUse(hotlinkedAppAudioVideoBandwidth, hotlinkedAppAudioVideoRequests)}`)
  console.log(`               Apps       (json): ${prettyPercentUse(hotlinkedAppJSONBandwidth, hotlinkedAppJSONRequests)}`)
  console.log(`               Apps      (other): ${prettyPercentUse(hotlinkedAppOtherBandwidth, hotlinkedAppOtherRequests)}`)
  console.log()


  // C: catch everything else
  let cTotalBandwidth = totalBandwidth - aTotalBandwidth - bTotalBandwidth
  let cTotalRequests = totalRequests - aTotalRequests - bTotalRequests
  console.log(`C: Other Total:                   ${prettyPercentUse(cTotalBandwidth, cTotalRequests)}`)
  console.log(`                 Windows (proxy): ${prettyPercentUse(otherProxyPACWindowsBandwidth, otherProxyPACWindowsRequests)}`)
  console.log(`                  IPTV/Streaming: ${prettyPercentUse(otherVideoBandwidth, otherVideoRequests)}`)
  console.log(`              Remaining (images): ${prettyPercentUse(remainingImagesBandwidth, remainingImagesRequests)}`)
  console.log(`              Remaining  (media): ${prettyPercentUse(remainingAudioVideoBandwidth, remainingAudioVideoRequests)}`)
  console.log(`              Remaining   (json): ${prettyPercentUse(remainingJSONBandwidth, remainingJSONRequests)}`)
  console.log(`              Remaining  (other): ${prettyPercentUse(remainingOtherBandwidth, remainingOtherRequests)}`)

  console.log()
  
  let unaccountedBandwidth = totalBandwidth - aTotalBandwidth - bTotalBandwidth - cTotalBandwidth
  let unaccountedRequests = totalRequests - aTotalRequests - bTotalRequests - cTotalRequests
  console.log(`Extra check for unaccounted requests to see if imperfect request matching produces meaningful error:`)
  console.log(`Unaccounted  Totals (~zero): ${prettyPercentUse(unaccountedBandwidth, unaccountedRequests)}`)
  let unaccountedDetailBandwidth = totalBandwidth - hostingBrowserBandwidth - hotlinkedBrowserImagesBandwidth - hotlinkedBrowserAudioVideoBandwidth - hotlinkedBrowserJSONBandwidth - hotlinkedBrowserOtherBandwidth -
                                   otherProxyPACBrowserBandwidth - hotlinkedAppImagesBandwidth - hotlinkedAppAudioVideoBandwidth - hotlinkedAppJSONBandwidth - remainingOtherBandwidth -
                                   otherProxyPACWindowsBandwidth - otherVideoBandwidth - remainingImagesBandwidth - remainingAudioVideoBandwidth - remainingJSONBandwidth - remainingOtherBandwidth
  let unaccountedDetailRequests = totalRequests - hostingBrowserRequests - hotlinkedBrowserImagesRequests - hotlinkedBrowserAudioVideoRequests - hotlinkedBrowserJSONRequests - hotlinkedBrowserOtherRequests -
                                  otherProxyPACBrowserRequests - hotlinkedAppImagesRequests - hotlinkedAppAudioVideoRequests - hotlinkedAppJSONRequests - hotlinkedAppOtherRequests -
                                  otherProxyPACWindowsRequests - otherVideoRequests - remainingImagesRequests - remainingAudioVideoRequests - remainingJSONRequests - remainingOtherRequests
  console.log(`Unaccounted Details (~zero): ${prettyPercentUse(unaccountedDetailBandwidth, unaccountedDetailRequests)}`)
  console.log()
})
