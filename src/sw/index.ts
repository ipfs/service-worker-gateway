import { getGatewayRoot } from '../lib/to-gateway-root.ts'

// ensure the contents of this file change on every deployment, otherwise
// browsers will not download and install any updated version of this service
// worker
const version = '<%= GIT_VERSION %>'
version.toString()

// load from the gateway root - this makes no difference for inbrowser.link/dev
// since it is on the public suffix list but self-hosters will used cached
// versions on subsequent loads
importScripts(`${getGatewayRoot()}<%-- src/sw/sw.ts --%>`)
