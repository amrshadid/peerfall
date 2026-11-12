/**
 * Just enough of IndexedDB for the VM's saved boot: open with an
 * upgrade, one object store per transaction, get / put / clear, oncomplete. Values are structured-cloned
 * like the real thing, and requests succeed on a later task.
 */

interface FakeRequest<T> {
  result: T
  error: DOMException | null
  onsuccess: (() => void) | null
  onerror: (() => void) | null
}

interface FakeOpenRequest extends FakeRequest<FakeDatabase> {
  onupgradeneeded: (() => void) | null
}

type Records = Map<string, unknown>

interface FakeTransaction {
  objectStore(name: string): FakeObjectStore
  oncomplete: (() => void) | null
  onerror: (() => void) | null
  onabort: (() => void) | null
}

interface FakeDatabase {
  readonly objectStoreNames: { contains(name: string): boolean }
  createObjectStore(name: string): void
  transaction(name: string, mode?: IDBTransactionMode): FakeTransaction
  close(): void
}

interface FakeObjectStore {
  get(key: string): FakeRequest<unknown>
  put(value: unknown, key: string): FakeRequest<string>
  clear(): FakeRequest<undefined>
}

function settle<T>(request: FakeRequest<T>, run: () => T): FakeRequest<T> {
  setTimeout(() => {
    request.result = run()
    request.onsuccess?.()
  })
  return request
}

function newRequest<T>(): FakeRequest<T> {
  return { result: undefined as T, error: null, onsuccess: null, onerror: null }
}

function objectStore(records: Records): FakeObjectStore {
  return {
    get: (key) => settle(newRequest(), () => structuredClone(records.get(key))),
    put: (value, key) =>
      settle(newRequest(), () => {
        records.set(key, structuredClone(value))
        return key
      }),
    clear: () =>
      settle(newRequest(), () => {
        records.clear()
        return undefined
      }),
  }
}

/** A fresh, empty IndexedDB, to stub as the global `indexedDB`. */
export function fakeIndexedDb() {
  const databases = new Map<string, { version: number; stores: Map<string, Records> }>()
  return {
    open(name: string, version: number): FakeOpenRequest {
      const request: FakeOpenRequest = { ...newRequest<FakeDatabase>(), onupgradeneeded: null }
      setTimeout(() => {
        const entry = databases.get(name) ?? { version: 0, stores: new Map<string, Records>() }
        databases.set(name, entry)
        request.result = {
          objectStoreNames: { contains: (store) => entry.stores.has(store) },
          createObjectStore: (store) => {
            entry.stores.set(store, new Map())
          },
          transaction: (store) => {
            const records = entry.stores.get(store)
            if (!records) {
              throw new DOMException(`No object store named ${store}`, 'NotFoundError')
            }
            const transaction: FakeTransaction = {
              objectStore: () => objectStore(records),
              oncomplete: null,
              onerror: null,
              onabort: null,
            }
            // Completes after the requests made in the same task, as a real transaction does.
            setTimeout(() => setTimeout(() => transaction.oncomplete?.()))
            return transaction
          },
          close: () => {},
        }
        if (entry.version < version) {
          entry.version = version
          request.onupgradeneeded?.()
        }
        request.onsuccess?.()
      })
      return request
    },
  }
}
