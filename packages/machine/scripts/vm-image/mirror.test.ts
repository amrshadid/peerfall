import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MIRROR, fetchPinnedFile, MIRROR_SUMS, mirrorBase, writeMirror } from '#vm-image/mirror'

const dirs: string[] = []
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'kf-mirror-'))
  dirs.push(dir)
  return dir
}

/** A network with these URLs; anything else is a 404. */
function network(files: Record<string, string>) {
  const fetched: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    fetched.push(url)
    const body = files[url]
    return body === undefined ? new Response('gone', { status: 404 }) : new Response(body)
  })
  return fetched
}

afterEach(() => {
  vi.unstubAllGlobals()
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

const text = (data: Uint8Array) => new TextDecoder().decode(data)

describe('the package mirror', () => {
  it('takes the mirror from PF_VM_MIRROR, else the release default', () => {
    expect(mirrorBase({ PF_VM_MIRROR: 'https://example.org/m/' })).toBe('https://example.org/m/')
    expect(mirrorBase({})).toBe(DEFAULT_MIRROR)
  })

  it('downloads from upstream first, and caches what it got', async () => {
    const cache = tempDir()
    const fetched = network({ 'https://alpine/gcc-1.apk': 'upstream' })
    expect(text(await fetchPinnedFile('https://alpine/gcc-1.apk', 'gcc-1.apk', cache, 'https://m/'))).toBe('upstream')
    expect(text(await fetchPinnedFile('https://alpine/gcc-1.apk', 'gcc-1.apk', cache, 'https://m/'))).toBe('upstream')
    expect(fetched).toEqual(['https://alpine/gcc-1.apk'])
  })

  it("falls back to the mirror's copy of a file upstream deleted, and fails when neither has it", async () => {
    const cache = tempDir()
    const fetched = network({ 'https://m/gcc-1.apk': 'mirrored' })
    expect(text(await fetchPinnedFile('https://alpine/gcc-1.apk', 'gcc-1.apk', cache, 'https://m/'))).toBe('mirrored')
    expect(fetched).toEqual(['https://alpine/gcc-1.apk', 'https://m/gcc-1.apk'])
    await expect(fetchPinnedFile('https://alpine/x.apk', 'x.apk', cache, 'https://m/')).rejects.toThrow(
      /x.apk: not upstream .* nor on the mirror/
    )
  })

  it('writes the files flat, with a SHA256SUMS that sha256sum -c can check', () => {
    const dir = tempDir()
    writeMirror(
      dir,
      new Map([
        ['seabios.bin', new TextEncoder().encode('b')],
        ['bash-5.apk', new TextEncoder().encode('a')],
      ])
    )
    expect(readFileSync(join(dir, 'bash-5.apk'), 'utf8')).toBe('a')
    expect(readFileSync(join(dir, MIRROR_SUMS), 'utf8')).toBe(
      'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb  bash-5.apk\n' +
        '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d  seabios.bin\n'
    )
  })
})
