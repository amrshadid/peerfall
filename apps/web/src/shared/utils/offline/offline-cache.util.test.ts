import { VM_FILE_CACHE as MACHINE_VM_FILE_CACHE } from '@peerfall/machine/types'
import { describe, expect, it } from 'vitest'
import { SW_MANIFEST_TOKEN, VM_FILE_CACHE } from './offline-cache.constants'
import {
  appCacheName,
  imageFilesOf,
  imageListUrl,
  injectSwManifest,
  isStaleAppCache,
  type OfflineRequest,
  offlineRouteOf,
  precacheFiles,
} from './offline-cache.util'

const SCOPE = 'https://peerfall.example/'
const get = (path: string, extra: Partial<OfflineRequest> = {}): OfflineRequest => ({
  method: 'GET',
  url: new URL(path, SCOPE).href,
  mode: 'cors',
  range: false,
  ...extra,
})

describe('precacheFiles', () => {
  it('keeps the shell and hashed files, sorted, without the image, maps or the worker', () => {
    const files = precacheFiles([
      'assets/index-Drmk3EdP.js',
      'index.html',
      'assets/index-Drmk3EdP.js.map',
      'sw.js',
      '/favicon.svg',
      'vm/manifest.json',
      'vm/63fa49019e00/vmlinuz',
      'assets/v86-DTA5CHKx.wasm',
      'favicon.svg',
    ])
    expect(files).toEqual(['assets/index-Drmk3EdP.js', 'assets/v86-DTA5CHKx.wasm', 'favicon.svg', 'index.html'])
  })
})

describe('app caches', () => {
  it('names one cache per build and drops only older builds', () => {
    const current = appCacheName('a1b2c3')
    expect(current).toBe('peerfall-app-a1b2c3')
    expect(isStaleAppCache('peerfall-app-0ld', current)).toBe(true)
    expect(isStaleAppCache(current, current)).toBe(false)
    expect(isStaleAppCache('peerfall-vm-files-v1', current)).toBe(false)
    expect(isStaleAppCache('peerfall-offline-v1', current)).toBe(false)
  })

  it("shares the machine's image cache", () => {
    expect(VM_FILE_CACHE).toBe(MACHINE_VM_FILE_CACHE)
  })
})

describe('injectSwManifest', () => {
  const manifest = { version: 'v1', files: ['index.html', "it's.js"] }

  it('puts the manifest where the token was, whatever quotes the minifier chose', () => {
    for (const quote of ["'", '"', '`']) {
      const code = `const m=JSON.parse(${quote}${SW_MANIFEST_TOKEN}${quote});`
      const injected = injectSwManifest(code, manifest)
      expect(injected).not.toBeNull()
      const literal = injected?.slice('const m=JSON.parse('.length, -2) ?? ''
      expect(JSON.parse(JSON.parse(literal))).toEqual(manifest)
    }
  })

  it('is null when the worker lost its token', () => {
    expect(injectSwManifest('const m = 1', manifest)).toBeNull()
    expect(injectSwManifest(`x${SW_MANIFEST_TOKEN}`, manifest)).toBeNull()
  })
})

describe('the image files cached for offline play', () => {
  const FILE = 0o100644
  const LINK = 0o120777
  const DIR = 0o040755
  // The shape of v86's fs.json: [name, size, mtime, mode, uid, gid, children or file].
  const FS = {
    fsroot: [
      [
        'bin',
        0,
        0,
        DIR,
        0,
        0,
        [
          ['bash', 815636, 0, FILE, 0, 0, '08e938121b.bin.zst'],
          ['sh', 12, 0, LINK, 0, 0, '/bin/busybox'],
        ],
      ],
      ['boot', 0, 0, DIR, 0, 0, [['vmlinuz-virt', 8106496, 0, FILE, 0, 0, 'kernel.bin.zst']]],
      ['lib', 0, 0, DIR, 0, 0, [['modules', 0, 0, DIR, 0, 0, [['veth.ko.gz', 9000, 0, FILE, 0, 0, 'veth.bin.zst']]]]],
      [
        'usr',
        0,
        0,
        DIR,
        0,
        0,
        [
          [
            'lib',
            0,
            0,
            DIR,
            0,
            0,
            [
              [
                'frr',
                0,
                0,
                DIR,
                0,
                0,
                [
                  ['ospfd', 1, 0, FILE, 0, 0, 'ospfd.bin.zst'],
                  ['bash', 1, 0, FILE, 0, 0, '08e938121b.bin.zst'],
                ],
              ],
            ],
          ],
        ],
      ],
    ],
  }

  it('lists every file the game may open once, without links, the kernel or its modules', () => {
    expect(imageFilesOf(FS)).toEqual(['08e938121b.bin.zst', 'ospfd.bin.zst'])
  })

  it('lists nothing from a file list it cannot read', () => {
    expect(imageFilesOf(null)).toEqual([])
    expect(imageFilesOf({ fsroot: 'x' })).toEqual([])
  })

  it("finds an image version's file list beside its files", () => {
    expect(imageListUrl(SCOPE, 'd725945d2815')).toBe(`${SCOPE}vm/d725945d2815/fs.json`)
  })
})

describe('offlineRouteOf', () => {
  it('serves page loads from the shell', () => {
    expect(offlineRouteOf(get('/', { mode: 'navigate' }), SCOPE)).toBe('shell')
    expect(offlineRouteOf(get('/index.html', { mode: 'navigate' }), SCOPE)).toBe('shell')
  })

  it('leaves any other address to the host: its 404 page, or a file such as robots.txt', () => {
    expect(offlineRouteOf(get('/does-not-exist', { mode: 'navigate' }), SCOPE)).toBe('pass')
    expect(offlineRouteOf(get('/robots.txt', { mode: 'navigate' }), SCOPE)).toBe('pass')
  })

  it('goes to the network first for the image manifest, cache first for image files', () => {
    expect(offlineRouteOf(get('/vm/manifest.json'), SCOPE)).toBe('manifest')
    expect(offlineRouteOf(get('/vm/63fa49019e00/bios/seabios.bin'), SCOPE)).toBe('vm-file')
    expect(offlineRouteOf(get('/vm/63fa49019e00/disk.img', { range: true }), SCOPE)).toBe('pass')
  })

  it('caches the app files, and leaves the worker, other origins and writes alone', () => {
    expect(offlineRouteOf(get('/assets/index-Drmk3EdP.js'), SCOPE)).toBe('asset')
    expect(offlineRouteOf(get('/sw.js'), SCOPE)).toBe('pass')
    expect(offlineRouteOf(get('https://fonts.example/a.woff2'), SCOPE)).toBe('pass')
    expect(offlineRouteOf(get('/assets/x.js', { method: 'POST' }), SCOPE)).toBe('pass')
  })

  it("passes Microsoft Clarity's tag and uploads straight to the network", () => {
    expect(offlineRouteOf(get('https://www.clarity.ms/tag/abc123'), SCOPE)).toBe('pass')
    expect(offlineRouteOf(get('https://scripts.clarity.ms/0.8.0/clarity.js'), SCOPE)).toBe('pass')
    expect(offlineRouteOf(get('https://k.clarity.ms/collect', { method: 'POST' }), SCOPE)).toBe('pass')
  })

  it('works under a sub-path base', () => {
    const scope = `${SCOPE}peerfall/`
    expect(offlineRouteOf(get('/peerfall/vm/manifest.json'), scope)).toBe('manifest')
    expect(offlineRouteOf(get('/peerfall/assets/a.js'), scope)).toBe('asset')
    expect(offlineRouteOf(get('/other/assets/a.js'), scope)).toBe('pass')
  })
})
