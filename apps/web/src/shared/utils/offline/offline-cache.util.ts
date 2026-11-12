import { APP_CACHE_PREFIX, SW_FILE, SW_MANIFEST_TOKEN, VM_DIR, VM_MANIFEST } from './offline-cache.constants'

export interface SwManifest {
  readonly version: string
  readonly files: readonly string[]
}

export type OfflineRoute = 'pass' | 'shell' | 'manifest' | 'vm-file' | 'asset'

export interface OfflineRequest {
  readonly method: string
  readonly url: string
  readonly mode: string
  /** A Range request gets a 206, which Cache Storage refuses. */
  readonly range: boolean
}

export function precacheFiles(files: readonly string[]): string[] {
  const paths = files.map((file) => file.replace(/^\/+/, ''))
  return [...new Set(paths)]
    .filter((path) => path !== '' && path !== SW_FILE && !path.endsWith('.map') && !path.startsWith(VM_DIR))
    .sort()
}

export function appCacheName(version: string): string {
  return `${APP_CACHE_PREFIX}${version}`
}

// Only the app's caches: the image's files and the saved manifest outlive builds.
export function isStaleAppCache(name: string, current: string): boolean {
  return name.startsWith(APP_CACHE_PREFIX) && name !== current
}

export function injectSwManifest(code: string, manifest: SwManifest): string | null {
  // Built here, not at module level: the worker imports this file, and a top-level pattern would
  // be bundled into it with the token, then turn invalid once the manifest replaces that token.
  const tokenLiteral = new RegExp(`(['"\`])${SW_MANIFEST_TOKEN}\\1`, 'g')
  // A JS string literal holding the JSON, so the worker's JSON.parse reads it back.
  const literal = JSON.stringify(JSON.stringify(manifest))
  let found = false
  const injected = code.replace(tokenLiteral, () => {
    found = true
    return literal
  })
  return found ? injected : null
}

export function offlineRouteOf(request: OfflineRequest, scope: string): OfflineRoute {
  if (request.method !== 'GET') {
    return 'pass'
  }
  const url = new URL(request.url)
  const base = new URL(scope)
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
    return 'pass'
  }
  if (request.mode === 'navigate') {
    return 'shell'
  }
  const path = url.pathname.slice(base.pathname.length)
  if (path === VM_MANIFEST) {
    return 'manifest'
  }
  if (path.startsWith(VM_DIR)) {
    return request.range ? 'pass' : 'vm-file'
  }
  return path === SW_FILE ? 'pass' : 'asset'
}
