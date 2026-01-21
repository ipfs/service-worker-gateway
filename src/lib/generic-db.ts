type DbKeys<T> = (keyof T)
type validDbKey<T, K> = K extends IDBValidKey ? keyof T : never

interface TypedIDBDatabase<T> extends IDBDatabase {
  get<K extends keyof T>(key: validDbKey<T, K>): Promise<T[K]>
  put<K extends DbKeys<T>>(value: T[K], key: validDbKey<T, K>): Promise<void>
  store(name: string): IDBObjectStore
}

export class GenericIDB<T> {
  private db: TypedIDBDatabase<T> | null = null

  constructor (private readonly dbName: string, private readonly storeName: string) {
  }

  readonly #openDatabase = async (): Promise<TypedIDBDatabase<T>> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)
      request.onerror = () => { reject(request.error ?? new Error('Could not open DB')) }
      request.onsuccess = () => { resolve(request.result as TypedIDBDatabase<T>) }
      request.onupgradeneeded = (event) => {
        const db = request.result
        db.createObjectStore(this.storeName)
      }
    })
  }

  async open (): Promise<void> {
    this.db = await this.#openDatabase()
  }

  async put <K extends keyof T>(key: any extends K ? never : K & IDBValidKey, value: any extends (K extends keyof T ? T[K] : never) ? never : T[K]): Promise<void> {
    if (this.db == null) {
      throw new Error('Database not opened')
    }
    const transaction = this.db.transaction(this.storeName, 'readwrite')
    const store = transaction.objectStore(this.storeName)
    const request = store.put(value, key)
    return new Promise((resolve, reject) => {
      request.onerror = () => { reject(request.error ?? new Error(`Could not set "${String(key)}" to "${value}" `)) }
      request.onsuccess = () => { resolve() }
    })
  }

  async get<K extends keyof T> (key: any extends T[K] ? never : K & IDBValidKey): Promise<K extends keyof T ? T[K] : never> {
    if (this.db == null) {
      throw new Error('Database not opened')
    }

    const transaction = this.db.transaction(this.storeName, 'readonly')
    const store = transaction.objectStore(this.storeName)
    const request = store.get(key) as IDBRequest<T[K]>

    return new Promise<any>((resolve, reject) => {
      request.onerror = () => {
        reject(request.error ?? new Error(`Could not get value for "${String(key)}"`))
      }
      request.onsuccess = () => {
        resolve(request.result)
      }
    })
  }

  async getAll (): Promise<T> {
    if (this.db == null) {
      throw new Error('Database not opened')
    }

    const transaction = this.db.transaction(this.storeName, 'readonly')
    const store = transaction.objectStore(this.storeName)

    return new Promise((resolve, reject) => {
      // @ts-expect-error - its empty right now...
      const result: { [K in keyof T]: T[K] } = {}
      const request = store.openCursor()

      request.onerror = () => {
        reject(request.error ?? new Error(`Could not get all keys and values from store "${this.storeName}"`))
      }

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor != null) {
          result[cursor.key as keyof T] = cursor.value as T[keyof T]
          cursor.continue()
        } else {
          resolve(result)
        }
      }
    })
  }

  close (): void {
    if (this.db != null) {
      this.db.close()
      this.db = null
    }
  }
}
