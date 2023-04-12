import { CID } from 'multiformats/cid'
import { base58btc } from 'multiformats/bases/base58'
import { BitswapMessage as Message } from '../message/index.js'
import { Wantlist } from '../wantlist/index.js'
import { Ledger } from './ledger.js'
import { RequestQueue } from './req-queue.js'
import { DefaultTaskMerger } from './task-merger.js'
import { logger } from '../utils/index.js'
import { trackedMap } from '@libp2p/tracked-map'
import type { Message as PBMessage } from '../message/message.js'
import type { BitswapMessageEntry } from '../message/entry.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Blockstore } from 'interface-blockstore'
import type { Network } from '../network.js'
import type { Stats } from '../stats/index.js'
import type { Libp2p } from '@libp2p/interface-libp2p'
import type { Logger } from '@libp2p/logger'
import type { WantListEntry } from '../wantlist/entry.js'

export interface TaskMerger {
  /**
   * Given the existing tasks with the same topic, does the task add some new
   * information? Used to decide whether to merge the task or ignore it.
   */
  hasNewInfo: (task: Task, tasksWithTopic: Task[]) => boolean

  /**
   * Merge the information from the task into the existing pending task.
   */
  merge: (newTask: Task, existingTask: Task) => void
}

export interface Task {
  /**
   * A name for the Task (like an id but not necessarily unique)
   */
  topic: string
  /**
   * Priority for the Task (tasks are ordered by priority per peer).
   */
  priority: number
  /**
   * The size of the task, e.g. the number of bytes in a block.
   */
  size: number

  data: TaskData
}

export interface TaskData {
  /**
   * The size of the block, if known (if we don't have the block this is zero)
   */
  blockSize: number
  /**
   * Indicates if the request is for a block or for a HAVE.
   */
  isWantBlock: boolean
  /**
   * Indicates if we have the block.
   */
  haveBlock: boolean
  /**
   * Indicates whether to send a DONT_HAVE response if we don't have the block.
   * If this is `false` and we don't have the block, we just ignore the
   * want-block request (useful for discovery where we query lots of peers but
   * don't want a response unless the peer has the block).
   */
  sendDontHave: boolean
}

const WantType = Message.WantType

// The ideal size of the batched payload. We try to pop this much data off the
// request queue, but
// - if there isn't any more data in the queue we send whatever we have
// - if there are several small items in the queue (eg HAVE response) followed
//   by one big item (eg a block) that would exceed this target size, we
//   include the big item in the message
const TARGET_MESSAGE_SIZE = 16 * 1024

// If the client sends a want-have, and the engine has the corresponding block,
// we check the size of the block and if it's small enough we send the block
// itself, rather than sending a HAVE.
// This constant defines the maximum size up to which we replace a HAVE with
// a block.
const MAX_SIZE_REPLACE_HAS_WITH_BLOCK = 1024

export interface DecisionEngineOptions {
  targetMessageSize?: number
  maxSizeReplaceHasWithBlock?: number
}

export interface PeerLedger {
  peer: PeerId
  value: number
  sent: number
  recv: number
  exchanged: number
}

export class DecisionEngine {
  private readonly _log: Logger
  public blockstore: Blockstore
  public network: Network
  private readonly _stats: Stats
  private readonly _opts: Required<DecisionEngineOptions>
  public ledgerMap: Map<string, Ledger>
  private _running: boolean
  public _requestQueue: RequestQueue

  constructor (peerId: PeerId, blockstore: Blockstore, network: Network, stats: Stats, libp2p: Libp2p, opts: DecisionEngineOptions = {}) {
    this._log = logger(peerId, 'engine')
    this.blockstore = blockstore
    this.network = network
    this._stats = stats
    this._opts = this._processOpts(opts)

    // A list of of ledgers by their partner id
    this.ledgerMap = trackedMap({
      name: 'ipfs_bitswap_ledger_map',
      metrics: libp2p.metrics
    })
    this._running = false

    // Queue of want-have / want-block per peer
    this._requestQueue = new RequestQueue(DefaultTaskMerger)
  }

  _processOpts (opts: DecisionEngineOptions): Required<DecisionEngineOptions> {
    return {
      maxSizeReplaceHasWithBlock: MAX_SIZE_REPLACE_HAS_WITH_BLOCK,
      targetMessageSize: TARGET_MESSAGE_SIZE,
      ...opts
    }
  }

  _scheduleProcessTasks (): void {
    setTimeout(() => {
      this._processTasks().catch(err => {
        this._log.error('error processing stats', err)
      })
    })
  }

  /**
   * Pull tasks off the request queue and send a message to the corresponding
   * peer
   */
  async _processTasks (): Promise<void> {
    if (!this._running) {
      return
    }

    const { peerId, tasks, pendingSize } = this._requestQueue.popTasks(this._opts.targetMessageSize)

    if (tasks.length === 0) {
      return
    }

    // Create a new message
    const msg = new Message(false)

    // Amount of data in the request queue still waiting to be popped
    msg.setPendingBytes(pendingSize)

    // Split out want-blocks, want-haves and DONT_HAVEs
    const blockCids = []
    const blockTasks = new Map<string, TaskData>()
    for (const task of tasks) {
      const cid = CID.parse(task.topic)
      if (task.data.haveBlock) {
        if (task.data.isWantBlock) {
          blockCids.push(cid)
          blockTasks.set(task.topic, task.data)
        } else {
          // Add HAVES to the message
          msg.addHave(cid)
        }
      } else {
        // Add DONT_HAVEs to the message
        msg.addDontHave(cid)
      }
    }

    const blocks = await this._getBlocks(blockCids)
    for (const [topic, taskData] of blockTasks) {
      const cid = CID.parse(topic)
      const blk = blocks.get(topic)
      // If the block was found (it has not been removed)
      if (blk != null) {
        // Add the block to the message
        msg.addBlock(cid, blk)
      } else {
        // The block was not found. If the client requested DONT_HAVE,
        // add DONT_HAVE to the message.
        if (taskData.sendDontHave) {
          msg.addDontHave(cid)
        }
      }
    }

    // If there's nothing in the message, bail out
    if (msg.empty) {
      (peerId != null) && this._requestQueue.tasksDone(peerId, tasks)

      // Trigger the next round of task processing
      this._scheduleProcessTasks()

      return
    }

    try {
      // Send the message
      (peerId != null) && await this.network.sendMessage(peerId, msg)

      // Peform sent message accounting
      for (const [cidStr, block] of blocks.entries()) {
        (peerId != null) && this.messageSent(peerId, CID.parse(cidStr), block)
      }
    } catch (err) {
      this._log.error(err)
    }

    // Free the tasks up from the request queue
    (peerId != null) && this._requestQueue.tasksDone(peerId, tasks)

    // Trigger the next round of task processing
    this._scheduleProcessTasks()
  }

  wantlistForPeer (peerId: PeerId): Map<string, WantListEntry> {
    const peerIdStr = peerId.toString()
    const ledger = this.ledgerMap.get(peerIdStr)
    return (ledger != null) ? ledger.wantlist.sortedEntries() : new Map()
  }

  ledgerForPeer (peerId: PeerId): PeerLedger | undefined {
    const peerIdStr = peerId.toString()
    const ledger = this.ledgerMap.get(peerIdStr)

    if (ledger == null) {
      return undefined
    }

    return {
      peer: ledger.partner,
      value: ledger.debtRatio(),
      sent: ledger.accounting.bytesSent,
      recv: ledger.accounting.bytesRecv,
      exchanged: ledger.exchangeCount
    }
  }

  peers (): PeerId[] {
    return Array.from(this.ledgerMap.values()).map((l) => l.partner)
  }

  /**
   * Receive blocks either from an incoming message from the network, or from
   * blocks being added by the client on the localhost (eg IPFS add)
   */
  receivedBlocks (blocks: Array<{ cid: CID, block: Uint8Array }>): void {
    if (blocks.length === 0) {
      return
    }

    // For each connected peer, check if it wants the block we received
    for (const ledger of this.ledgerMap.values()) {
      for (const { cid, block } of blocks) {
        // Filter out blocks that we don't want
        const want = ledger.wantlistContains(cid)

        if (want == null) {
          continue
        }

        // If the block is small enough, just send the block, even if the
        // client asked for a HAVE
        const blockSize = block.length
        const isWantBlock = this._sendAsBlock(want.wantType, blockSize)

        let entrySize = blockSize
        if (!isWantBlock) {
          entrySize = Message.blockPresenceSize(want.cid)
        }

        this._requestQueue.pushTasks(ledger.partner, [{
          topic: want.cid.toString(base58btc),
          priority: want.priority,
          size: entrySize,
          data: {
            blockSize,
            isWantBlock,
            haveBlock: true,
            sendDontHave: false
          }
        }])
      }
    }

    this._scheduleProcessTasks()
  }

  /**
   * Handle incoming messages
   */
  async messageReceived (peerId: PeerId, msg: Message): Promise<void> {
    const ledger = this._findOrCreate(peerId)

    if (msg.empty) {
      return
    }

    // If the message has a full wantlist, clear the current wantlist
    if (msg.full) {
      ledger.wantlist = new Wantlist()
    }

    // Record the amount of block data received
    this._updateBlockAccounting(msg.blocks, ledger)

    if (msg.wantlist.size === 0) {
      this._scheduleProcessTasks()
      return
    }

    // Clear cancelled wants and add new wants to the ledger
    const cancels: CID[] = []
    const wants: BitswapMessageEntry[] = []
    msg.wantlist.forEach((entry) => {
      if (entry.cancel) {
        ledger.cancelWant(entry.cid)
        cancels.push(entry.cid)
      } else {
        ledger.wants(entry.cid, entry.priority, entry.wantType)
        wants.push(entry)
      }
    })

    this._cancelWants(peerId, cancels)
    await this._addWants(peerId, wants)

    this._scheduleProcessTasks()
  }

  _cancelWants (peerId: PeerId, cids: CID[]): void {
    for (const c of cids) {
      this._requestQueue.remove(c.toString(base58btc), peerId)
    }
  }

  async _addWants (peerId: PeerId, wants: BitswapMessageEntry[]): Promise<void> {
    // Get the size of each wanted block
    const blockSizes = await this._getBlockSizes(wants.map(w => w.cid))

    const tasks = []
    for (const want of wants) {
      const id = want.cid.toString(base58btc)
      const blockSize = blockSizes.get(id)

      // If the block was not found
      if (blockSize == null) {
        // Only add the task to the queue if the requester wants a DONT_HAVE
        if (want.sendDontHave) {
          tasks.push({
            topic: id,
            priority: want.priority,
            size: Message.blockPresenceSize(want.cid),
            data: {
              isWantBlock: want.wantType === WantType.Block,
              blockSize: 0,
              haveBlock: false,
              sendDontHave: want.sendDontHave
            }
          })
        }
      } else {
        // The block was found, add it to the queue

        // If the block is small enough, just send the block, even if the
        // client asked for a HAVE
        const isWantBlock = this._sendAsBlock(want.wantType, blockSize)

        // entrySize is the amount of space the entry takes up in the
        // message we send to the recipient. If we're sending a block, the
        // entrySize is the size of the block. Otherwise it's the size of
        // a block presence entry.
        let entrySize = blockSize
        if (!isWantBlock) {
          entrySize = Message.blockPresenceSize(want.cid)
        }

        tasks.push({
          topic: id,
          priority: want.priority,
          size: entrySize,
          data: {
            isWantBlock,
            blockSize,
            haveBlock: true,
            sendDontHave: want.sendDontHave
          }
        })
      }

      this._requestQueue.pushTasks(peerId, tasks)
    }
  }

  _sendAsBlock (wantType: PBMessage.Wantlist.WantType, blockSize: number): boolean {
    return wantType === WantType.Block ||
      blockSize <= this._opts.maxSizeReplaceHasWithBlock
  }

  async _getBlockSizes (cids: CID[]): Promise<Map<string, number>> {
    const blocks = await this._getBlocks(cids)
    return new Map([...blocks].map(([k, v]) => [k, v.length]))
  }

  async _getBlocks (cids: CID[]): Promise<Map<string, Uint8Array>> {
    const res = new Map()
    await Promise.all(cids.map(async (cid) => {
      try {
        const block = await this.blockstore.get(cid)
        res.set(cid.toString(base58btc), block)
      } catch (err: any) {
        if (err.code !== 'ERR_NOT_FOUND') {
          this._log.error('failed to query blockstore for %s: %s', cid, err)
        }
      }
    }))
    return res
  }

  _updateBlockAccounting (blocksMap: Map<string, Uint8Array>, ledger: Ledger): void {
    for (const block of blocksMap.values()) {
      this._log('got block (%s bytes)', block.length)
      ledger.receivedBytes(block.length)
    }
  }

  /**
   * Clear up all accounting things after message was sent
   */
  messageSent (peerId: PeerId, cid: CID, block: Uint8Array): void {
    const ledger = this._findOrCreate(peerId)
    ledger.sentBytes(block.length)
    ledger.wantlist.remove(cid)
  }

  numBytesSentTo (peerId: PeerId): number {
    return this._findOrCreate(peerId).accounting.bytesSent
  }

  numBytesReceivedFrom (peerId: PeerId): number {
    return this._findOrCreate(peerId).accounting.bytesRecv
  }

  peerDisconnected (peerId: PeerId): void {
    this.ledgerMap.delete(peerId.toString())
  }

  _findOrCreate (peerId: PeerId): Ledger {
    const peerIdStr = peerId.toString()
    const ledger = this.ledgerMap.get(peerIdStr)
    if (ledger != null) {
      return ledger
    }

    const l = new Ledger(peerId)

    this.ledgerMap.set(peerIdStr, l)
    if (this._stats != null) {
      this._stats.push(peerIdStr, 'peerCount', 1)
    }

    return l
  }

  start (): void {
    this._running = true
  }

  stop (): void {
    this._running = false
  }
}
