import type { Libp2p } from 'libp2p'
import { multiaddr } from '@multiformats/multiaddr'
import type { createHelia } from 'helia'
import { getFile } from './getFile'
import type { ChannelActions } from './common.ts'
import { COLORS } from './common.ts'
import type { ChannelUserValues, HeliaServiceWorkerCommsChannel } from './channel.ts'

interface ConnectAndGetFileOptions {
  channel: HeliaServiceWorkerCommsChannel<ChannelUserValues>
  localMultiaddr?: string
  fileCid: string
  helia: Awaited<ReturnType<typeof createHelia>>
  action: ChannelActions | keyof typeof ChannelActions
  cb?: (data: { fileContent: string, action: ChannelActions | keyof typeof ChannelActions }) => Promise<void>
}

export async function connectAndGetFile ({ channel, localMultiaddr, fileCid, helia, cb, action }: ConnectAndGetFileOptions): Promise<void> {
  let localConnection: Awaited<ReturnType<Libp2p['dial']>> | undefined
  if (localMultiaddr != null && localMultiaddr.trim() !== '') {
    console.log('localMultiaddr: ', localMultiaddr)
    const ma = multiaddr(localMultiaddr)
    try {
      channel.postMessage({
        action: 'SHOW_STATUS',
        data: {
          text: `Dialing to local node at provided multiaddr ${ma}...`,
          color: COLORS.active
        }
      })
      localConnection = await helia?.libp2p.dial(ma)
      channel.postMessage({
        action: 'SHOW_STATUS',
        data: {
          text: 'Connected to local node...',
          color: COLORS.success,
          id: null
        }
      })
    } catch (e) {
      channel.postMessage({
        action: 'SHOW_STATUS',
        data: {
          text: `Error dialing local node: ${(e as Error)?.message}`,
          color: COLORS.error
        }
      })
    }
  } else {
    channel.postMessage({
      action: 'SHOW_STATUS',
      data: {
        text: 'No local multiaddr provided, skipping dial to local node',
        color: COLORS.default
      }
    })
  }

  const fileContent = await getFile({ fileCid, helia, channel })
  if (cb != null) {
    // eslint-disable-next-line n/no-callback-literal
    await cb({ fileContent, action })
  }
  if (localConnection != null) {
    channel.postMessage({
      action: 'SHOW_STATUS',
      data: {
        text: 'Closing connection to local node...',
        color: COLORS.active
      }
    })
    await localConnection.close()
    channel.postMessage({
      action: 'SHOW_STATUS',
      data: {
        text: 'Connection to local node closed',
        color: COLORS.success
      }
    })
  }

  channel.postMessage({
    action: 'SHOW_STATUS',
    data: {
      text: 'Stopping Helia...',
      color: COLORS.active
    }
  })
  await helia.stop()
  channel.postMessage({
    action: 'SHOW_STATUS',
    data: {
      text: 'Helia stopped',
      color: COLORS.success
    }
  })

  // blank line to separate the output from the next
  channel.postMessage({
    action: 'SHOW_STATUS',
    data: {
      text: ''
    }
  })
}
