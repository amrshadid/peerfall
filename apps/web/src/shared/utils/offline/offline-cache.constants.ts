export const SW_FILE = 'sw.js'

export const APP_CACHE_PREFIX = 'peerfall-app-'

export const RUNTIME_CACHE = 'peerfall-offline-v1'

// Copied from the machine package: a worker importing app modules would need an `import` it can't run.
export const VM_FILE_CACHE = 'peerfall-vm-files-v1'

export const VM_DIR = 'vm/'
export const VM_MANIFEST = 'vm/manifest.json'

// Read by search engines and link previews, never by the game: not worth a player's offline cache.
export const CRAWLER_FILES: readonly string[] = ['og.png', 'robots.txt', 'sitemap.xml']

// Routes live in the hash, so every navigation is this one page.
export const APP_SHELL = 'index.html'

export const SW_MANIFEST_TOKEN = '__PF_SW_MANIFEST__'

export const NAVIGATION_TIMEOUT_MS = 4000
