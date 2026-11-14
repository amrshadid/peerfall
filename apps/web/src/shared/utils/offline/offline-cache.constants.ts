export const SW_FILE = 'sw.js'

export const APP_CACHE_PREFIX = 'peerfall-app-'

export const RUNTIME_CACHE = 'peerfall-offline-v1'

// Copied from the machine package: a worker importing app modules would need an `import` it can't run.
export const VM_FILE_CACHE = 'peerfall-vm-files-v1'

export const VM_DIR = 'vm/'
export const VM_MANIFEST = 'vm/manifest.json'

/** The image's file list, beside its `flat/` folder. */
export const VM_FILE_LIST = 'fs.json'

/**
 * Image folders the Machine never reads after boot: v86 boots the kernel from its own copy, and
 * the modules the network needs (veth, sch_netem) are loaded at boot, into the saved Machine.
 * Together about 26 MB of the image's 38. A network that loads a module of its own (macvlan, for
 * vrrpd) needs that module's files kept here before it plays offline.
 */
export const IMAGE_FILES_NEVER_OPENED = ['/boot/', '/lib/modules/']

/** Image files fetched at once while the cache is filled in the background. */
export const VM_WARM_CONCURRENCY = 2

/** What the app posts to the service worker once a network is up: cache the rest of the image. */
export const SW_WARM_MESSAGE = 'peerfall:warm-vm-image'

// Read by search engines and link previews, never by the game: not worth a player's offline cache.
export const CRAWLER_FILES: readonly string[] = ['og.png', 'robots.txt', 'sitemap.xml']

// Routes live in the hash, so the root's navigation is this one page.
export const APP_SHELL = 'index.html'

export const SW_MANIFEST_TOKEN = '__PF_SW_MANIFEST__'

export const NAVIGATION_TIMEOUT_MS = 4000
