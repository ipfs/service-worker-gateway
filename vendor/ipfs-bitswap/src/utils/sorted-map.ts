
/**
 * SortedMap is a Map whose iterator order can be defined by the user
 */
export class SortedMap<Key, Value> extends Map<Key, Value> {
  private readonly _cmp: (a: [Key, Value], b: [Key, Value]) => number
  private _keys: Key[]

  constructor (entries?: Array<[Key, Value]>, cmp?: (a: [Key, Value], b: [Key, Value]) => number) {
    super()

    this._cmp = cmp ?? this._defaultSort
    this._keys = []

    for (const [k, v] of entries ?? []) {
      this.set(k, v)
    }
  }

  /**
   * Call update to update the position of the key when it should change.
   * For example if the compare function sorts by the priority field, and the
   * priority changes, call update.
   * Call indexOf() to get the index _before_ the change happens.
   */
  update (i: number): void {
    if (i < 0 || i >= this._keys.length) {
      return
    }

    const k = this._keys[i]
    this._keys.splice(i, 1)
    const newIdx = this._find(k)
    this._keys.splice(newIdx, 0, k)
  }

  set (k: Key, v: Value): this {
    // If the key is already in the map, remove it from the ordering and
    // re-insert it below
    if (this.has(k)) {
      const i = this.indexOf(k)
      this._keys.splice(i, 1)
    }

    // Update / insert the k/v into the map
    super.set(k, v)

    // Find the correct position of the newly inserted k/v in the order
    const i = this._find(k)
    this._keys.splice(i, 0, k)

    return this
  }

  clear (): void {
    super.clear()
    this._keys = []
  }

  delete (k: Key): boolean {
    if (!this.has(k)) {
      return false
    }

    const i = this.indexOf(k)
    this._keys.splice(i, 1)
    return super.delete(k)
  }

  indexOf (k: Key): number {
    if (!this.has(k)) {
      return -1
    }

    const i = this._find(k)
    if (this._keys[i] === k) {
      return i
    }

    // There may be more than one key with the same ordering
    // eg { k1: <priority 5>, k2: <priority 5> }
    // so scan outwards until the key matches
    for (let j = 1; j < this._keys.length; j++) {
      if (this._keys[i + j] === k) return i + j
      if (this._keys[i - j] === k) return i - j
    }

    return -1 // should never happen for existing key
  }

  _find (k: Key): number {
    let lower = 0
    let upper = this._keys.length
    while (lower < upper) {
      const pivot = (lower + upper) >>> 1 // lower + (upper - lower) / 2
      const cmp = this._kCmp(this._keys[pivot], k)
      // console.log(`  _find ${lower}:${upper}[${pivot}] ${cmp}`)
      if (cmp < 0) { // pivot < k
        lower = pivot + 1
      } else if (cmp > 0) { // pivot > k
        upper = pivot
      } else { // pivot == k
        return pivot
      }
    }
    return lower
  }

  * keys (): IterableIterator<Key> {
    for (const k of this._keys) {
      yield k
    }

    return undefined
  }

  * values (): IterableIterator<Value> {
    for (const k of this._keys) {
      // @ts-expect-error - return of `this.get(k)` is `Value|undefined` which is
      // incompatible with `Value`. Typechecker can't that this contains values
      // for all the `_keys`. ts(2322)
      yield this.get(k)
    }

    return undefined
  }

  * entries (): IterableIterator<[Key, Value]> {
    for (const k of this._keys) {
      // @ts-expect-error - return of `this.get(k)` is `Value|undefined` which is
      // incompatible with `Value`. Typechecker can't that this contains values
      // for all the `_keys`. ts(2322)
      yield [k, this.get(k)]
    }

    return undefined
  }

  * [Symbol.iterator] (): IterableIterator<[Key, Value]> {
    yield * this.entries()
  }

  // @ts-expect-error - Callback in Map forEach is (V, K, Map<K, V>) => void
  forEach (cb: (entry: [Key, Value]) => void, thisArg: SortedMap<Key, Value> = this): void {
    if (cb == null) {
      return
    }

    for (const k of this._keys) {
      const val = this.get(k)

      if (val == null) {
        throw new Error('Value cannot be undefined')
      }

      cb.apply(thisArg, [[k, val]])
    }
  }

  _defaultSort (a: [Key, Value], b: [Key, Value]): 0 | 1 | -1 {
    if (a[0] < b[0]) return -1
    if (b[0] < a[0]) return 1
    return 0
  }

  _kCmp (a: Key, b: Key): number {
    return this._cmp(
      // @ts-expect-error - get may return undefined
      [a, this.get(a)],
      [b, this.get(b)]
    )
  }
}
