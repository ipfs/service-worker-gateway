import type { PeerId } from '@libp2p/interface-peer-id'
import { SortedMap } from '../utils/sorted-map.js'
import type { Task, TaskMerger } from './index.js'

export interface PopTaskResult {
  peerId?: PeerId
  tasks: Task[]
  pendingSize: number
}

export interface PendingTask {
  created: number
  task: Task
}

/**
 * The task merger that is used by default.
 * Assumes that new tasks do not add any information over existing tasks,
 * and doesn't try to merge.
 */
const DefaultTaskMerger: TaskMerger = {
  hasNewInfo () {
    return false
  },

  merge () {}
}

/**
 * Queue of requests to be processed by the engine.
 * The requests from each peer are added to the peer's queue, sorted by
 * priority.
 * Tasks are popped in priority order from the best peer - see popTasks()
 * for more details.
 */
export class RequestQueue {
  private readonly _taskMerger: TaskMerger
  public _byPeer: SortedMap<string, PeerTasks>

  constructor (taskMerger: TaskMerger = DefaultTaskMerger) {
    this._taskMerger = taskMerger
    this._byPeer = new SortedMap([], PeerTasks.compare)
  }

  /**
   * Push tasks onto the queue for the given peer
   */
  pushTasks (peerId: PeerId, tasks: Task[]): void {
    let peerTasks = this._byPeer.get(peerId.toString())

    if (peerTasks == null) {
      peerTasks = new PeerTasks(peerId, this._taskMerger)
    }

    peerTasks.pushTasks(tasks)
    this._byPeer.set(peerId.toString(), peerTasks)
  }

  /**
   * Choose the peer with the least active work (or if all have the same active
   * work, the most pending tasks) and pop off the highest priority tasks until
   * the total size is at least targetMinBytes.
   * This puts the popped tasks into the "active" state, meaning they are
   * actively being processed (and cannot be modified).
   */
  popTasks (targetMinBytes: number): PopTaskResult {
    // Get the queue of tasks for the best peer and pop off tasks up to
    // targetMinBytes
    const peerTasks = this._head()
    if (peerTasks === undefined) {
      return { tasks: [], pendingSize: 0 }
    }

    const { tasks, pendingSize } = peerTasks.popTasks(targetMinBytes)
    if (tasks.length === 0) {
      return { tasks, pendingSize }
    }

    const peerId = peerTasks.peerId
    if (peerTasks.isIdle()) {
      // If there are no more tasks for the peer, free up its memory
      this._byPeer.delete(peerId.toString())
    } else {
      // If there are still tasks remaining, update the sort order of peerTasks
      // (because it depends on the number of pending tasks)
      this._byPeer.update(0)
    }

    return {
      peerId, tasks, pendingSize
    }
  }

  _head (): PeerTasks | undefined {
    // Shortcut
    if (this._byPeer.size === 0) {
      return undefined
    }

    // eslint-disable-next-line no-unreachable-loop
    for (const [, v] of this._byPeer) {
      return v
    }

    return undefined
  }

  /**
   * Remove the task with the given topic for the given peer.
   */
  remove (topic: string, peerId: PeerId): void {
    const peerTasks = this._byPeer.get(peerId.toString())
    peerTasks?.remove(topic)
  }

  /**
   * Called when the tasks for the given peer complete.
   */
  tasksDone (peerId: PeerId, tasks: Task[]): void {
    const peerTasks = this._byPeer.get(peerId.toString())
    if (peerTasks == null) {
      return
    }

    const i = this._byPeer.indexOf(peerId.toString())
    for (const task of tasks) {
      peerTasks.taskDone(task)
    }

    // Marking the tasks as done takes them out of the "active" state, and the
    // sort order depends on the size of the active tasks, so we need to update
    // the order.
    this._byPeer.update(i)
  }
}

/**
 * Queue of tasks for a particular peer, sorted by priority.
 */
class PeerTasks {
  public peerId: PeerId
  private readonly _taskMerger: TaskMerger
  private _activeTotalSize: number
  private readonly _pending: PendingTasks
  private readonly _active: Set<Task>

  constructor (peerId: PeerId, taskMerger: TaskMerger) {
    this.peerId = peerId
    this._taskMerger = taskMerger
    this._activeTotalSize = 0
    this._pending = new PendingTasks()
    this._active = new Set()
  }

  /**
   * Push tasks onto the queue
   */
  pushTasks (tasks: Task[]): void {
    for (const t of tasks) {
      this._pushTask(t)
    }
  }

  _pushTask (task: Task): void {
    // If the new task doesn't add any more information over what we
    // already have in the active queue, then we can skip the new task
    if (!this._taskHasMoreInfoThanActiveTasks(task)) {
      return
    }

    // If there is already a non-active (pending) task with this topic
    const existingTask = this._pending.get(task.topic)
    if (existingTask != null) {
      // If the new task has a higher priority than the old task,
      if (task.priority > existingTask.priority) {
        // Update the priority and the task's position in the queue
        this._pending.updatePriority(task.topic, task.priority)
      }

      // Merge the information from the new task into the existing task
      this._taskMerger.merge(task, existingTask)

      // A task with the topic exists, so we don't need to add
      // the new task to the queue
      return
    }

    // Push the new task onto the queue
    this._pending.add(task)
  }

  /**
   * Indicates whether the new task adds any more information over tasks that are
   * already in the active task queue
   */
  _taskHasMoreInfoThanActiveTasks (task: Task): boolean {
    const tasksWithTopic = []
    for (const activeTask of this._active) {
      if (activeTask.topic === task.topic) {
        tasksWithTopic.push(activeTask)
      }
    }

    // No tasks with that topic, so the new task adds information
    if (tasksWithTopic.length === 0) {
      return true
    }

    return this._taskMerger.hasNewInfo(task, tasksWithTopic)
  }

  /**
   * Pop tasks off the queue such that the total size is at least targetMinBytes
   */
  popTasks (targetMinBytes: number): PopTaskResult {
    let size = 0
    const tasks = []

    // Keep popping tasks until we get up to targetMinBytes (or one item over
    // targetMinBytes)
    const pendingTasks = this._pending.tasks()
    for (let i = 0; i < pendingTasks.length && size < targetMinBytes; i++) {
      const task = pendingTasks[i]
      tasks.push(task)
      size += task.size

      // Move tasks from pending to active
      this._pending.delete(task.topic)
      this._activeTotalSize += task.size
      this._active.add(task)
    }

    return {
      tasks, pendingSize: this._pending.totalSize
    }
  }

  /**
   * Called when a task completes.
   * Note: must be the same reference as returned from popTasks.
   */
  taskDone (task: Task): void {
    if (this._active.has(task)) {
      this._activeTotalSize -= task.size
      this._active.delete(task)
    }
  }

  /**
   * Remove pending tasks with the given topic
   */
  remove (topic: string): void {
    this._pending.delete(topic)
  }

  /**
   * No work to be done, this PeerTasks object can be freed.
   */
  isIdle (): boolean {
    return this._pending.length === 0 && this._active.size === 0
  }

  /**
   * Compare PeerTasks
   */
  static compare <Key> (a: [Key, PeerTasks], b: [Key, PeerTasks]): number {
    // Move peers with no pending tasks to the back of the queue
    if (a[1]._pending.length === 0) {
      return 1
    }
    if (b[1]._pending.length === 0) {
      return -1
    }

    // If the amount of active work is the same
    if (a[1]._activeTotalSize === b[1]._activeTotalSize) {
      // Choose the peer with the most pending work
      return b[1]._pending.length - a[1]._pending.length
    }

    // Choose the peer with the least amount of active work ("keep peers busy")
    return a[1]._activeTotalSize - b[1]._activeTotalSize
  }
}

/**
 * Queue of pending tasks for a particular peer, sorted by priority.
 */
class PendingTasks {
  private readonly _tasks: SortedMap<string, PendingTask>

  constructor () {
    this._tasks = new SortedMap([], this._compare)
  }

  get length (): number {
    return this._tasks.size
  }

  /**
   * Sum of the size of all pending tasks
   **/
  get totalSize (): number {
    return [...this._tasks.values()].reduce((a, t) => a + t.task.size, 0)
  }

  get (topic: string): Task | undefined {
    return this._tasks?.get(topic)?.task
  }

  add (task: Task): void {
    this._tasks.set(task.topic, {
      created: Date.now(),
      task
    })
  }

  delete (topic: string): void {
    this._tasks.delete(topic)
  }

  // All pending tasks, in priority order
  tasks (): Task[] {
    return [...this._tasks.values()].map(i => i.task)
  }

  /**
   * Update the priority of the task with the given topic, and update the order
   **/
  updatePriority (topic: string, priority: number): void {
    const obj = this._tasks.get(topic)
    if (obj == null) {
      return
    }

    const i = this._tasks.indexOf(topic)
    obj.task.priority = priority
    this._tasks.update(i)
  }

  /**
   * Sort by priority desc then FIFO
   */
  _compare (a: [string, PendingTask], b: [string, PendingTask]): number {
    if (a[1].task.priority === b[1].task.priority) {
      // FIFO
      return a[1].created - b[1].created
    }
    // Priority high -> low
    return b[1].task.priority - a[1].task.priority
  }
}
