// The service worker: keeps the app so it starts offline after one visit. Built by the build's
// service-worker plugin (vite.config.ts) into a classic script, so it imports nothing the app imports.
import {
  APP_SHELL,
  appCacheName,
  imageFilesOf,
  imageListUrl,
  isStaleAppCache,
  NAVIGATION_TIMEOUT_MS,
  offlineRouteOf,
  RUNTIME_CACHE,
  SW_MANIFEST_TOKEN,
  SW_WARM_MESSAGE,
  type SwManifest,
  VM_FILE_CACHE,
  VM_MANIFEST,
  VM_WARM_CONCURRENCY,
} from '@shared/utils/offline'

// The app compiles against the DOM library, which has no worker events; these are the parts used.
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}

interface FetchEvent extends ExtendableEvent {
  readonly request: Request
  respondWith(response: Promise<Response>): void
}

interface ExtendableMessageEvent extends ExtendableEvent {
  readonly data: unknown
}

interface WorkerScope {
  readonly registration: { readonly scope: string }
  readonly clients: { claim(): Promise<void> }
  skipWaiting(): Promise<void>
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEvent) => void): void
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void
  addEventListener(type: 'message', listener: (event: ExtendableMessageEvent) => void): void
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

let warming: Promise<void> | null = null

/**
 * The Machine fetches the image's files as Linux opens them, so a player who goes offline would
 * miss every daemon no mission of theirs has started yet (ospfd, bfdd…). Once a network is up,
 * every file the game may open is cached, two at a time, skipping the ones already there.
 */
async function warmImage(): Promise<void> {
  const manifest = await (await caches.open(RUNTIME_CACHE)).match(urlOf(VM_MANIFEST))
  if (!manifest) {
    return
  }
  const { version } = (await manifest.json()) as { version: string }
  const listUrl = imageListUrl(scope, version)
  const cache = await caches.open(VM_FILE_CACHE)
  const list = (await cache.match(listUrl)) ?? (await fetch(listUrl))
  const queue = imageFilesOf(await list.json())
  const flat = new URL('flat/', listUrl).href
  const lane = async () => {
    for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
      const url = flat + file
      if (await cache.match(url)) {
        continue
      }
      const response = await fetch(url)
      if (keepable(response)) {
        await cache.put(url, response)
      }
    }
  }
  await Promise.all(Array.from({ length: VM_WARM_CONCURRENCY }, lane))
}

worker.addEventListener('message', (event) => {
  if (event.data !== SW_WARM_MESSAGE || warming !== null) {
    return
  }
  // Offline or interrupted, it stops; the next network that comes up starts it again.
  warming = warmImage()
    .catch(() => undefined)
    .finally(() => {
      warming = null
    })
  event.waitUntil(warming)
})

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
