import { VM_FILE_CACHE } from '#types/definitions/vm'

const loads = new Map<string, Promise<ArrayBuffer>>()

/**
 * Loads an image file once per worker and once per browser: concurrent opens share one fetch,
 * and Cache Storage keeps it for later visits. Image files are content-addressed, so never stale.
 */
export function loadVmFile(url: string): Promise<ArrayBuffer> {
  const known = loads.get(url)
  if (known) {
    return known
  }
  const load = (async () => {
    const cache = typeof caches === 'undefined' ? null : await caches.open(VM_FILE_CACHE)
    const hit = await cache?.match(url)
    if (hit) {
      return hit.arrayBuffer()
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${url}: HTTP ${response.status}`)
    }
    await cache?.put(url, response.clone())
    return response.arrayBuffer()
  })()
  loads.set(url, load)
  load.catch(() => loads.delete(url))
  return load
}

/** Forgets the files loaded in this worker (tests). */
export function resetVmFiles(): void {
  loads.clear()
}

/**
 * v86 loads 9p files with XMLHttpRequest and drops each one after close, so each new vtysh would
 * download FRR's library (several MB) again. Its `flat/` requests go through `loadVmFile` instead.
 */
export function installVmFileCache(scope: { XMLHttpRequest: typeof XMLHttpRequest }): void {
  class CachingXHR extends scope.XMLHttpRequest {
    #url: string | null = null

    override open(method: string, url: string | URL, ...rest: [boolean?, string?, string?]): void {
      const href = String(url)
      if (method.toLowerCase() === 'get' && href.includes('/flat/')) {
        this.#url = href
        return
      }
      super.open(method, href, rest[0] ?? true, rest[1], rest[2])
    }

    override setRequestHeader(name: string, value: string): void {
      if (this.#url === null) {
        super.setRequestHeader(name, value)
      }
    }

    override send(body?: Document | XMLHttpRequestBodyInit | null): void {
      if (this.#url === null) {
        super.send(body)
        return
      }
      loadVmFile(this.#url).then(
        (buffer) => {
          // A copy: v86 may keep or transfer what it gets, and the cached one serves the next open.
          for (const [key, value] of Object.entries({ readyState: 4, status: 200, response: buffer.slice(0) })) {
            Object.defineProperty(this, key, { value, configurable: true })
          }
          // v86 never reads the event; a plain Event also exists outside browsers.
          this.onload?.(new Event('load') as ProgressEvent)
        },
        () => this.onerror?.(new Event('error') as ProgressEvent)
      )
    }
  }
  scope.XMLHttpRequest = CachingXHR
}
