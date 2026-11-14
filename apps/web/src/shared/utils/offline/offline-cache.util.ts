import {
  APP_CACHE_PREFIX,
  APP_SHELL,
  IMAGE_FILES_NEVER_OPENED,
  SW_FILE,
  SW_MANIFEST_TOKEN,
  VM_DIR,
  VM_FILE_LIST,
  VM_MANIFEST,
} from './offline-cache.constants'

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
  const path = url.pathname.slice(base.pathname.length)
  if (request.mode === 'navigate') {
    // Routes live in the hash, so only the root is the game: any other address goes to the host,
    // which answers with its 404 page (or the file, for robots.txt and the like).
    return path === '' || path === APP_SHELL ? 'shell' : 'pass'
  }
  if (path === VM_MANIFEST) {
    return 'manifest'
  }
  if (path.startsWith(VM_DIR)) {
    return request.range ? 'pass' : 'vm-file'
  }
  return path === SW_FILE ? 'pass' : 'asset'
}

/** Where an image version keeps its file list; its files sit in `flat/` beside it. */
export function imageListUrl(scope: string, version: string): string {
  return new URL(`${VM_DIR}${version}/${VM_FILE_LIST}`, scope).href
}

const S_IFMT = 0o170000
const S_IFREG = 0o100000

/**
 * The `flat/` files of the image (named in its `fs.json`, v86's
 * `[name, size, mtime, mode, uid, gid, children or file]` entries) that the game may open, so they
 * can be cached before the player goes offline. Left out: what the Machine never opens after boot.
 */
export function imageFilesOf(fsJson: unknown): string[] {
  const root = (fsJson as { fsroot?: unknown } | null)?.fsroot
  const files = new Set<string>()
  const walk = (entries: unknown, parent: string) => {
    if (!Array.isArray(entries)) {
      return
    }
    for (const entry of entries) {
      if (!Array.isArray(entry)) {
        continue
      }
      const [name, , , mode, , , target] = entry as [unknown, unknown, unknown, unknown, unknown, unknown, unknown]
      const path = `${parent}/${String(name)}`
      if (Array.isArray(target)) {
        if (!IMAGE_FILES_NEVER_OPENED.some((skipped) => `${path}/`.startsWith(skipped))) {
          walk(target, path)
        }
      } else if (typeof mode === 'number' && (mode & S_IFMT) === S_IFREG && typeof target === 'string') {
        files.add(target)
      }
    }
  }
  walk(root, '')
  return [...files].sort()
}
