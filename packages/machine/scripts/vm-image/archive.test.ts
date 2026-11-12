import { gunzipSync, gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { readTarGz, writeCpioGz } from '#vm-image/archive'

const encoder = new TextEncoder()

/** A ustar header block for one entry, enough for the reader. */
function header(name: string, type: string, size: number, link = ''): Uint8Array {
  const block = new Uint8Array(512)
  const put = (text: string, offset: number) => block.set(encoder.encode(text), offset)
  put(name, 0)
  put('0000755\0', 100)
  put('0000000\0', 108)
  put('0000000\0', 116)
  put(`${size.toString(8).padStart(11, '0')}\0`, 124)
  put('00000000000\0', 136)
  put(type, 156)
  put(link, 157)
  return block
}

const padded = (data: Uint8Array) => {
  const out = new Uint8Array(Math.ceil(data.length / 512) * 512)
  out.set(data)
  return out
}

describe('readTarGz', () => {
  it('reads files, directories and links across back-to-back gzip members, as in an .apk', () => {
    const body = encoder.encode('hello\n')
    const first = gzipSync(
      Buffer.concat([header('./etc/', '5', 0), header('./etc/motd', '0', body.length), padded(body)])
    )
    const second = gzipSync(Buffer.concat([header('bin/sh', '2', 0, '/bin/busybox'), new Uint8Array(1024)]))
    const entries = readTarGz(Buffer.concat([first, second]))
    expect(entries.map(({ path, kind, link }) => ({ path, kind, link }))).toEqual([
      { path: 'etc', kind: 'dir', link: '' },
      { path: 'etc/motd', kind: 'file', link: '' },
      { path: 'bin/sh', kind: 'symlink', link: '/bin/busybox' },
    ])
    expect(new TextDecoder().decode(entries[1]?.data)).toBe('hello\n')
  })

  it('takes a long name from a PAX header', () => {
    const name = `usr/include/${'x'.repeat(120)}.h`
    const record = ` path=${name}\n`
    const pax = encoder.encode(`${record.length + String(record.length + 3).length}${record}`)
    const fixed = encoder.encode(`${pax.length}${record}`)
    const archive = gzipSync(
      Buffer.concat([header('PaxHeader', 'x', fixed.length), padded(fixed), header('short', '0', 0)])
    )
    expect(readTarGz(archive)[0]?.path).toBe(name)
  })
})

describe('writeCpioGz', () => {
  it('writes newc records padded to four bytes, ending with the trailer', () => {
    const cpio = new TextDecoder().decode(
      gunzipSync(writeCpioGz([{ path: 'init', mode: 0o100755, data: encoder.encode('#!/bin/sh\n') }]))
    )
    expect(cpio.startsWith('070701')).toBe(true)
    expect(cpio).toContain('init\0')
    expect(cpio).toContain('#!/bin/sh\n')
    expect(cpio).toContain('TRAILER!!!\0')
    expect(cpio.length % 4).toBe(0)
  })

  it('names Unix as the OS in the gzip header, whatever machine builds the image', () => {
    const archive = writeCpioGz([{ path: 'init', mode: 0o100755, data: encoder.encode('#!/bin/sh\n') }])

    expect(archive[9]).toBe(3)
  })
})
