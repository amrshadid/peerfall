import { VM_STATE_DB, VM_STATE_STORE } from '#types/definitions/vm'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VM_STATE_DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(VM_STATE_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** The boot saved for this image, or null: none yet, another image's, or storage refused. */
export async function loadVmState(version: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve) => {
      const request = db.transaction(VM_STATE_STORE).objectStore(VM_STATE_STORE).get(version)
      request.onsuccess = () => resolve(request.result instanceof ArrayBuffer ? request.result : null)
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/** Keeps only this image's boot: an older image's would never be restored again. */
export async function saveVmState(version: string, state: ArrayBuffer): Promise<boolean> {
  try {
    const db = await openDb()
    return await new Promise((resolve) => {
      const tx = db.transaction(VM_STATE_STORE, 'readwrite')
      const store = tx.objectStore(VM_STATE_STORE)
      store.clear()
      store.put(state, version)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
      tx.onabort = () => resolve(false)
    })
  } catch {
    return false
  }
}
