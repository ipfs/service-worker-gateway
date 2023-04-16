/* eslint-env mocha */

import { expect } from 'aegir/chai'
import * as CONSTANTS from '../../src/constants.js'
import { BitswapMessage as Message } from '../../src/message/index.js'
import { WantManager } from '../../src/want-manager/index.js'
import { Stats } from '../../src/stats/index.js'
import { mockNetwork } from '../utils/mocks.js'
import { makeBlocks } from '../utils/make-blocks.js'
import { makePeerIds } from '../utils/make-peer-id.js'

describe('WantManager', () => {
  it('sends wantlist to all connected peers', async function () {
    this.timeout(80 * 1000)

    const peerIds = await makePeerIds(3)
    const blocks = await makeBlocks(3)
    const cids = blocks.map((b) => b.cid)

    const peer1 = peerIds[0]
    const peer2 = peerIds[1]
    const cid1 = cids[0]
    const cid2 = cids[1]
    const cid3 = cids[2]

    const m1 = new Message(true)
    m1.addEntry(cid1, CONSTANTS.kMaxPriority)
    m1.addEntry(cid2, CONSTANTS.kMaxPriority - 1)

    const m2 = new Message(false)
    m2.cancel(cid2)

    const m3 = new Message(false)
    m3.addEntry(cid3, CONSTANTS.kMaxPriority)

    const msgs = [m1, m1, m2, m2, m3, m3]

    await new Promise<void>((resolve, reject) => {
      const network = mockNetwork(6, (calls) => {
        expect(calls.connects).to.have.length(6)
        expect(calls.messages).to.have.length(6)

        for (let ii = 0; ii < calls.messages.length; ii++) {
          const message = calls.messages[ii]
          const connect = calls.connects[ii]
          expect(message[0]).to.be.eql(connect)
          if (!message[1].equals(msgs[ii])) {
            reject(
              new Error('expected messages to match')
            ); return
          }
        }

        resolve()
      })

      // @ts-expect-error {} is not a real libp2p
      const wantManager = new WantManager(peerIds[2], network, new Stats({}), {})

      wantManager.start()
      wantManager.wantBlocks([cid1, cid2])

      wantManager.connected(peer1)
      wantManager.connected(peer2)

      new Promise(resolve => setTimeout(resolve, 200))
        .then(async () => {
          wantManager.cancelWants([cid2])
          await new Promise(resolve => setTimeout(resolve, 200))
          wantManager.wantBlocks([cid3])
        })
        .catch(reject)
    })
  })
})
