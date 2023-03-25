import { unixfs } from '@helia/unixfs'
import type { createHelia } from 'helia'
import { CID } from 'multiformats/cid'

import type { ChannelUserValues, HeliaServiceWorkerCommsChannel } from './channel.ts'
import { COLORS } from './common'

interface GetFileOptions {
  fileCid: string
  helia: Awaited<ReturnType<typeof createHelia>>
  channel: HeliaServiceWorkerCommsChannel<ChannelUserValues>
}

export const getFile = async ({ fileCid, helia, channel }: GetFileOptions): Promise<string> => {
  const peerId = helia.libp2p.peerId

  channel.postMessage({
    action: 'SHOW_STATUS',
    data: {
      text: `My ID is ${peerId}`,
      color: COLORS.active,
      id: peerId.toString()
    }
  })

  const fs = unixfs(helia)
  const cid = CID.parse(fileCid)

  channel.postMessage({
    action: 'SHOW_STATUS',
    data: {
      text: `Reading UnixFS text file ${cid}...`,
      color: COLORS.active
    }
  })

  const decoder = new TextDecoder()
  let text = ''

  for await (const chunk of fs.cat(cid)) {
    text += decoder.decode(chunk, {
      stream: true
    })
  }

  channel.postMessage({
    action: 'SHOW_STATUS',
    data: {
      text: `\u2514\u2500 CID: ${cid}`
    }
  })
  channel.postMessage({
    action: 'SHOW_STATUS',
    data: {
      text: `${text}`,
      color: COLORS.success
    }
  })

  return text
}
