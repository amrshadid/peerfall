// The service worker: keeps the app so it starts offline after one visit. Built by the build's
// service-worker plugin (vite.config.ts) into a classic script, so it imports nothing the app imports.
import {
  APP_SHELL,
  appCacheName,
  isStaleAppCache,
  NAVIGATION_TIMEOUT_MS,
  offlineRouteOf,
  RUNTIME_CACHE,
  SW_MANIFEST_TOKEN,
  type SwManifest,
  VM_FILE_CACHE,
} from '@shared/utils/offline'

// The app compiles against the DOM library, which has no worker events; these are the parts used.
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}

interface FetchEvent extends ExtendableEvent {
  readonly request: Request
  respondWith(response: Promise<Response>): void
}

interface WorkerScope {
  readonly registration: { readonly scope: string }
  readonly clients: { claim(): Promise<void> }
  skipWaiting(): Promise<void>
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEvent) => void): void
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void
}

const worker = self as unknown as WorkerScope
const manifest = JSON.parse(SW_MANIFEST_TOKEN) as SwManifest
const scope = worker.registration.scope
const current = appCacheName(manifest.version)
const urlOf = (path: string) => new URL(path, scope).href

worker.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(current)
      await cache.addAll(manifest.files.map((file) => new Request(urlOf(file), { cache: 'reload' })))
      // Takes over without reloading anything: an open page keeps the code it has, and the next load
      // gets this build.
      await worker.skipWaiting()
    })()
  )
})

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => isStaleAppCache(name, current)).map((name) => caches.delete(name)))
      await worker.clients.claim()
    })()
  )
})

const keepable = (response: Response) => response.status === 200 && response.type === 'basic'

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) {
    return hit
  }
  const response = await fetch(request)
  if (keepable(response)) {
    await cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (keepable(response)) {
      await cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const hit = await cache.match(request)
    if (hit) {
      return hit
    }
    throw error
  }
}

// A slow network falls back too, not only a missing one.
async function shell(request: Request): Promise<Response> {
  const network = fetch(request)
  network.catch(() => undefined)
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), NAVIGATION_TIMEOUT_MS))
  try {
    const first = await Promise.race([network, timeout])
    if (first) {
      return first
    }
  } catch {
    // Offline: the cached shell below.
  }
  const hit = await (await caches.open(current)).match(urlOf(APP_SHELL))
  return hit ?? network
}

worker.addEventListener('fetch', (event) => {
  const { request } = event
  const route = offlineRouteOf(
    { method: request.method, url: request.url, mode: request.mode, range: request.headers.has('range') },
    scope
  )
  switch (route) {
    case 'shell':
      event.respondWith(shell(request))
      return
    case 'manifest':
      event.respondWith(networkFirst(request, RUNTIME_CACHE))
      return
    case 'vm-file':
      event.respondWith(cacheFirst(request, VM_FILE_CACHE))
      return
    case 'asset':
      event.respondWith(cacheFirst(request, current))
      return
    default:
      return
  }
})
