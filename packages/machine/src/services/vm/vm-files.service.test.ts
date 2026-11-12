import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installVmFileCache, loadVmFile, resetVmFiles } from '#services/vm/vm-files.service'

const body = (text: string) => new Response(new TextEncoder().encode(text))

describe('loadVmFile', () => {
  beforeEach(() => resetVmFiles())
  afterEach(() => vi.unstubAllGlobals())

  it('fetches a file once, however many opens ask for it at the same time', async () => {
    const fetch = vi.fn(async () => body('libfrr'))
    vi.stubGlobal('fetch', fetch)
    const [first, second] = await Promise.all([
      loadVmFile('/vm/v1/flat/a.bin.zst'),
      loadVmFile('/vm/v1/flat/a.bin.zst'),
    ])
    expect(new TextDecoder().decode(first)).toBe('libfrr')
    expect(second).toBe(first)
    await loadVmFile('/vm/v1/flat/a.bin.zst')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps it in Cache Storage, so a later visit downloads nothing', async () => {
    const stored = new Map<string, Response>()
    vi.stubGlobal('caches', {
      open: async () => ({
        match: async (url: string) => stored.get(url)?.clone(),
        put: async (url: string, response: Response) => void stored.set(url, response),
      }),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => body('gcc'))
    )
    await loadVmFile('/vm/v1/flat/b.bin.zst')

    resetVmFiles()
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect(new TextDecoder().decode(await loadVmFile('/vm/v1/flat/b.bin.zst'))).toBe('gcc')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('forgets a failed load, so the next open tries again', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 }))
    )
    await expect(loadVmFile('/vm/v1/flat/c.bin.zst')).rejects.toThrow('HTTP 503')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => body('ok'))
    )
    expect(new TextDecoder().decode(await loadVmFile('/vm/v1/flat/c.bin.zst'))).toBe('ok')
  })
})

describe('installVmFileCache', () => {
  beforeEach(() => resetVmFiles())
  afterEach(() => vi.unstubAllGlobals())

  it("answers v86's image-file requests from the cache, and passes every other request on", async () => {
    const opened: string[] = []
    class RealXHR {
      open(_method: string, url: string) {
        opened.push(url)
      }
      setRequestHeader() {}
      send() {}
    }
    const scope = { XMLHttpRequest: RealXHR as unknown as typeof XMLHttpRequest }
    installVmFileCache(scope)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => body('busybox'))
    )

    const xhr = new scope.XMLHttpRequest()
    const loaded = new Promise<void>((resolve) => {
      xhr.onload = () => resolve()
    })
    xhr.open('get', '/vm/v1/flat/d.bin.zst')
    xhr.send()
    await loaded
    expect(xhr.status).toBe(200)
    expect(new TextDecoder().decode(xhr.response as ArrayBuffer)).toBe('busybox')

    const other = new scope.XMLHttpRequest()
    other.open('get', '/vm/v1/vmlinuz')
    expect(opened).toEqual(['/vm/v1/vmlinuz'])
  })
})
